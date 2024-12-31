from sqlalchemy import create_engine, text
import pandas as pd
import json
import jq
import datetime
import random

from src.hmh_exception import DBException

# Execute condition
def evaluate_condition(condition, variables):
    try:
        # -- Replace variables in the condition
        for var, value in variables.items():
            condition = condition.replace(f"${var}", str(value))
        
        # -- Evaluate the condition
        return eval(condition)
    except Exception as e:
        raise DBException(35,f"Error evaluating condition: {e}")


def replace_variables(input, variables, logging):
    try:
        output = input
        for key, value in variables.items():
            output = output.replace(f'${key}', str(value))

        logging.debug(f"Replaced {input} variables: {output}")
        return output
    except Exception as e:
        raise DBException(27,f"An error occurred while replacing variables: {e}")

# Execute test case
def execute_test_case(testCase, test_values, total_variables, logging):
    if not isinstance(testCase, dict):
        raise DBException(33,"Error: Each test must be a dictionary.")
    else:
        test_name = testCase.get('name', 'Unknown Test')
        condition = testCase.get('condition', '')
        on_failure = testCase.get('onFailure', 'continue').lower()

        if evaluate_condition(condition, total_variables):
            test_values.append({
                "test_name": test_name,
                "condition": condition,
                "onFailure": on_failure,
                "status": "Passed"
            })
            logging.info(f"Test Passed: {test_name} - Condition: {condition}")
        else:
            test_values.append({
                "test_name": test_name,
                "condition": condition,
                "onFailure": on_failure,
                "status": "Failed"
            })
            logging.info(f"Test Failed: {test_name} - Condition: {condition}")

            if on_failure == 'continue':
                logging.info("Continuing to the next step.")
            elif on_failure == 'exit':
                raise DBException(34,"Aborting the workflow due to test failure.")
            else:
                logging.info("Unknown onFailure value. Continuing to the next step.")
    
    return test_values


def run_db_flow(step, messageDetails, global_variables, logging):
    output_variables = {}

    try:

        # -- Extract database attributes
        db_type = step.get('dbtype')
        username = step.get('user')
        password = step.get('password')
        host = step.get('host')
        port = step.get('port')
        database = step.get('database')
        sql_query = step.get('query')

        # -- Check if null
        if(db_type=="" or db_type==None):
           raise DBException(26,"DatabaseType is required")
        else:
           db_type = replace_variables(db_type, global_variables, logging)

        if(username=="" or username==None):
           raise DBException(26,"Database username is required")
        else:
           username = replace_variables(username, global_variables, logging)
        
        if(password=="" or password==None):
           raise DBException(26,"Database password is required")
        else:
           password = replace_variables(password, global_variables, logging)
        
        if(host=="" or host==None):
           raise DBException(26,"Database host is required")
        else:
           host = replace_variables(host, global_variables, logging)
        
        if(port=="" or port==None):
           raise DBException(26,"Database port is required")
        else:
           port = replace_variables(port, global_variables, logging)

        if(database=="" or database==None):
           raise DBException(26,"Database service name is required")
        else:
           database = replace_variables(database, global_variables, logging)
    
        if(sql_query=="" or sql_query==None):
           raise DBException(26,"Database sql query is required")
        else:
           sql_query = replace_variables(sql_query, global_variables, logging)
        
        # -- Creating DB connection
        connection_string = None
        if db_type =="oracle":
           connection_string = f"{db_type}://{username}:{password}@{host}:{port}/?service_name={database}" 
        else:
           connection_string = f"{db_type}://{username}:{password}@{host}:{port}/{database}" 
        engine = create_engine(connection_string)

        # -- Execute the query
        with engine.connect() as connection:
            result = connection.execute(text(sql_query))
            rows = result.fetchall()
            column_names = result.keys()

        # -- Convert to DataFrame
        data_frame = pd.DataFrame(rows, columns=column_names)

        # -- Convert DataFrame to JSON
        result_json = json.loads(data_frame.to_json(orient='records'))
        logging.debug(f"SQL   : {sql_query}")
        logging.debug(f"Result: {result_json}")

        # -- Output processing
        output = step.get('outputs', {})
        if not isinstance(output, dict):
            raise DBException(28, "Error: 'output' must be a dictionary.")
        else:
            total_variables = {
                                **global_variables,
                                'today_datetime': datetime.datetime.now().strftime('%Y-%m-%dT%H:%M:%SZ'),
                                'today_date': datetime.date.today().isoformat(),
                                'today_time': datetime.datetime.now().strftime('%H:%M:%S'),
                                'today_date_zero_time': datetime.datetime.now().strftime('%Y-%m-%dT12:00:00Z'),
                                'response_body': result_json
                            }
            
            for key, value in output.items():
                try:
                    if value.startswith('random.'):
                        try:
                            func_name = value.split('random.')[1]
                            output_variables[key] = getattr(random, func_name.split('(')[0])(*eval(f"({func_name.split('(')[1]}"))
                        except Exception as e:
                            raise DBException(29, f"Error: Unsupported random value '{value}' - {e}")
                    else:
                        jq_filter = jq.compile(value)
                        output_variables[key] = jq_filter.input(total_variables).first()
                except Exception as e:
                    raise DBException(30, f"Error: Applying jq filter failed - {e}")

        total_variables.update(output_variables)

        # -- Print processing
        print_statements = step.get('prints', [])
        print_values = []
        if not isinstance(print_statements, list):
            raise DBException(31, "Error: 'print' statements must be a list.")
        else:
            if print_statements.__len__() > 0:
                logging.info("#### Print Variables #####")
            for statement in print_statements:
                if statement.startswith('$'):
                    print_values.append({
                        "variable": statement[1:],
                        "value": total_variables.get(statement[1:], 'Variable Not Set')
                    })
                    logging.info(f"{statement}: {total_variables.get(statement[1:], 'Variable Not Set')}")
                else:
                    raise DBException(32, "Print variable should start with $")

        if print_values.__len__() > 0:
            messageDetails.append({
                "type" : "print",
                "details" : print_values
            })

        # -- Testcase processing
        test_cases = step.get('tests', [])
        test_values = []
        if not isinstance(test_cases, list):
            raise DBException(36, "Error: 'test' cases must be a list.")
        else:
            if test_cases.__len__() > 0:
                logging.info("#### Execute Tests #####")
            for test_case in test_cases:
                test_values = execute_test_case(test_case, test_values, total_variables, logging)

        return output_variables,messageDetails

    except DBException as e:
        raise e 
    except Exception as e:
        raise DBException(25, f"An error occurred while processing DB step: {e}")
