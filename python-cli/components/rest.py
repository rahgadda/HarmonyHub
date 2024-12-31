import jq
import requests
import json
from requests.structures import CaseInsensitiveDict
import jinja2
import re
import datetime
import random

from src.hmh_exception import RestException

# Record Headers
def record_headers(self, flow=None, global_variables=None, logging=None):
    try:
        if flow is None:
            flow = self.workflow_data

        headers = flow.get('headers', {})

        if not headers:
            return {}
        elif not isinstance(headers, dict):
            raise Exception("Error: 'headers' must be a dictionary.")

        # Replace header values with global variables if they exist
        for key, value in headers.items():
            if isinstance(value, str):
                headers[key] = self.replace_variables(headers[key], global_variables, logging)
                    
        logging.debug(f"Added Headers: {headers}")

        return headers
    except Exception as e:
        raise Exception(f"An error occurred while extracting headers: {e}")

# Record Variables
def record_variables(flow):
    try:
        variables = flow.get('variables', {})
        if not isinstance(variables, dict):
            raise RestException(2,"Error: 'variables' must be a dictionary.")
        return variables
    except Exception as e:
        raise RestException(3, f"An error occurred while extracting variables: {e}")

# Execute condition
def evaluate_condition(condition, variables):
    try:
        # -- Replace variables in the condition
        for var, value in variables.items():
            condition = condition.replace(f"${var}", str(value))
        
        # -- Evaluate the condition
        return eval(condition)
    except Exception as e:
        raise RestException(4,f"Error evaluating condition: {e}")

# Execute test case
def execute_test_case(testCase, test_values, total_variables, logging):
    if not isinstance(testCase, dict):
        raise RestException(5,"Error: Each test must be a dictionary.")
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
                raise RestException(6,"Aborting the workflow due to test failure.")
            else:
                logging.info("Unknown onFailure value. Continuing to the next step.")
    
    return test_values

# Check if the input string is a Jinja template
def is_jinja(body_block):
    return bool(re.search('{{.+}}', body_block) or re.search('{%.+%}', body_block))

# Replace variables in the input string
def replace_variables(input, variables, logging):
    try:
        output = input
        for key, value in variables.items():
            output = output.replace(f'${key}', str(value))

        logging.debug(f"Replaced {input} variables: {output}")
        return output
    except Exception as e:
        raise RestException(7,f"An error occurred while replacing variables: {e}")

# Execute HTTP Request
def execute_http_request(method, url, headers, data=None):
    try:
        if method == 'POST':
            response = requests.post(url, headers=headers, json=data)
        elif method == 'PUT':
            response = requests.put(url, headers=headers, json=data)
        elif method == 'PATCH':
            response = requests.patch(url, headers=headers, json=data)
        elif method == 'DELETE':
            response = requests.delete(url, headers=headers, json=data)
        elif method == 'GET':
            response = requests.get(url, headers=headers)
        elif method == 'OPTIONS':
            response = requests.options(url, headers=headers)
        else:
            raise RestException(8,f"Error: Unsupported HTTP method '{method}'")
        
        response.raise_for_status()
        return response
    
    except requests.exceptions.HTTPError as e:
        raise RestException(9,f"HTTP Error: {e}")
    except requests.exceptions.ConnectionError as e:
        raise RestException(10,f"Error Connecting: {e}")
    except requests.exceptions.Timeout as e:
        raise RestException(11,f"Timeout Error: {e}")
    except Exception as e:
        raise RestException(12,f"Something went wrong: {e}")

def run_rest_flow(step, messageDetails, debugMode, global_headers, global_variables, logging):
    output_variables = {}

    try:
        # -- Extract http attributes
        http_config = step.get('http', {})
        if not isinstance(http_config, dict):
            raise RestException(13, "Error: 'http' configuration must be a dictionary.")
        
        # -- Method
        method = http_config.get('method').upper()
        if method not in ['GET','PATCH' ,'POST', 'PUT', 'DELETE', 'OPTIONS']:
            raise RestException(14, "Error: Invalid HTTP method.")
        
        # -- URL
        url = http_config.get('url')
        if not url:
            raise RestException(15, "Error: 'url' is required.")
        else:
            url = replace_variables(url, global_variables, logging)

        # -- Headers
        step_headers = record_headers(step, global_variables, logging) or {}
        total_headers = {**(global_headers or {}), **(step_headers or {})}

        # -- Body
        body = None
        if method in ['POST', 'PUT', 'PATCH']:
            body_block = step.get('data',None)
            if body_block is not None:
                try:
                    if is_jinja(body_block):
                        template = jinja2.Template(body_block)
                        body_template_value = template.render(global_variables)
                        body = json.loads(body_template_value)
                    else:
                        body = json.loads(body_block)
                except json.JSONDecodeError:
                    raise RestException(16, "Error: 'data' must be valid JSON.")
        
        if debugMode:
            messageDetails.append({
                "type" : "request",
                "details" : {
                    "method" : method,
                    "url" : url,
                    "headers" : total_headers,
                    "body" : body
                }
            })
        logging.debug('##### Request Inputs #####')
        logging.debug(f"Method: {method}")
        logging.debug(f"URL: {url}")
        logging.debug(f"Headers: {total_headers}")
        logging.debug(f"Body: {body}")

        # -- Create HTTP request
        response = execute_http_request(method, url, total_headers, body)

        logging.debug('##### Response Outputs #####')
        logging.debug(f"Status Code: {response.status_code}")
        logging.debug(f"Headers: {response.headers}")
        logging.debug(f"Body: {response.text}")

        # -- Output processing
        output = step.get('outputs', {})
        if not isinstance(output, dict):
            raise RestException(17, "Error: 'output' must be a dictionary.")
        else:
            total_variables = {
                                **global_variables,
                                'today_datetime': datetime.datetime.now().strftime('%Y-%m-%dT%H:%M:%SZ'),
                                'today_date': datetime.date.today().isoformat(),
                                'today_time': datetime.datetime.now().strftime('%H:%M:%S'),
                                'today_date_zero_time': datetime.datetime.now().strftime('%Y-%m-%dT12:00:00Z'),
                                'request_http_method': method,
                                'request_url': url,
                                'request_headers': dict(CaseInsensitiveDict(total_headers)),
                                'request_body': body,
                                'response_http_status': response.status_code,
                                'response_headers': dict(CaseInsensitiveDict(response.headers)),
                                'response_body': json.loads(response.text)
                            }
            
            for key, value in output.items():
                try:
                    if value.startswith('random.'):
                        try:
                            func_name = value.split('random.')[1]
                            output_variables[key] = getattr(random, func_name.split('(')[0])(*eval(f"({func_name.split('(')[1]}"))
                        except Exception as e:
                            raise RestException(18, f"Error: Unsupported random value '{value}' - {e}")
                    else:
                        jq_filter = jq.compile(value)
                        output_variables[key] = jq_filter.input(total_variables).first()
                except Exception as e:
                    raise RestException(19, f"Error: Applying jq filter failed - {e}")

        total_variables.update(output_variables)

        # -- Print processing
        print_statements = step.get('prints', [])
        print_values = []
        if not isinstance(print_statements, list):
            raise RestException(20, "Error: 'print' statements must be a list.")
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
                    raise RestException(21, "Print variable should start with $")

        if print_values.__len__() > 0:
            messageDetails.append({
                "type" : "print",
                "details" : print_values
            })

        # -- Testcase processing
        test_cases = step.get('tests', [])
        test_values = []
        if not isinstance(test_cases, list):
            raise RestException(22, "Error: 'test' cases must be a list.")
        else:
            if test_cases.__len__() > 0:
                logging.info("#### Execute Tests #####")
            for test_case in test_cases:
                test_values = execute_test_case(test_case, test_values, total_variables, logging)
                messageDetails.append({
                    "type" : "test",
                    "details" : test_values
                })

        return output_variables,messageDetails

    except RestException as e:
        raise e 
    except Exception as e:
        raise RestException(23, f"An error occurred while processing REST step: {e}")