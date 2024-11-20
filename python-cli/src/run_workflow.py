import yaml
import jq
import requests
import json
from requests.structures import CaseInsensitiveDict
import jinja2
import re
import datetime
import logging

def setup_logging(debug_mode):
    LOG_LEVEL = logging.DEBUG if debug_mode else logging.INFO
    logging.basicConfig(format='%(message)s', level=LOG_LEVEL)
    logging.getLogger().setLevel(LOG_LEVEL)

def reading_file(fileName):
    workflow = None    
    try:
        with open(fileName, 'r') as file:
            workflow = yaml.safe_load(file)
            return workflow
        
    except FileNotFoundError:
        raise Exception(f'File {fileName} not found')
    except yaml.YAMLError as e:
        raise Exception(f"Error: Parsing YAML failed - {e}")
    except Exception as e:
        raise Exception(f"An error occurred: {e}")

def record_headers(flow):
    try:
        headers = flow.get('headers', {})
        if not isinstance(headers, dict):
            raise Exception("Error: 'headers' must be a dictionary.")
        return headers
    except Exception as e:
        raise Exception(f"An error occurred while extracting headers: {e}")

def record_variables(flow):
    try:
        variables = flow.get('variables', {})
        if not isinstance(variables, dict):
            raise Exception("Error: 'variables' must be a dictionary.")
        return variables
    except Exception as e:
        raise Exception(f"An error occurred while extracting variables: {e}")

def evaluate_condition(condition, variables):
    try:
        # Replace variables in the condition
        for var, value in variables.items():
            condition = condition.replace(f"${var}", str(value))
        
        # Evaluate the condition
        return eval(condition)
    except Exception as e:
        raise Exception(f"Error evaluating condition: {e}")

def execute_test_case(testCase, total_variables):
    if not isinstance(testCase, dict):
        raise Exception("Error: Each test must be a dictionary.")
    else:
        test_name = testCase.get('name', 'Unknown Test')
        condition = testCase.get('condition', '')
        on_failure = testCase.get('onFailure', 'continue').lower()

        if evaluate_condition(condition, total_variables):
            logging.info(f"Test Passed: {test_name} - Condition: {condition}")
        else:
            logging.info(f"Test Failed: {test_name} - Condition: {condition}")

            if on_failure == 'continue':
                logging.info("Continuing to the next step.")
            elif on_failure == 'exit':
                raise Exception("Aborting the workflow due to test failure.")
            else:
                logging.info("Unknown onFailure value. Continuing to the next step.")

def is_jinja(body_block):
    return bool(re.search('{{.+}}', body_block) or re.search('{%.+%}', body_block))

def replace_variables(input, variables):
    try:
        output = input
        for key, value in variables.items():
            output = output.replace(f'${key}', str(value))

        logging.debug(f"Replaced {input} variables: {output}")
        return output
    except Exception as e:
        raise Exception(f"An error occurred while replacing variables: {e}")


def execute_http_request(method, url, headers, data=None):
    try:
        if method == 'POST':
            response = requests.post(url, headers=headers, json=data)
        elif method == 'PUT':
            response = requests.put(url, headers=headers, json=data)
        elif method == 'PATCH':
            response = requests.patch(url, headers=headers, json=data)
        elif method == 'GET':
            response = requests.get(url, headers=headers)
        elif method == 'DELETE':
            response = requests.delete(url, headers=headers)
        else:
            raise Exception(f"Error: Unsupported HTTP method '{method}'")
        
        response.raise_for_status()
        return response
    
    except requests.exceptions.HTTPError as e:
        raise Exception(f"HTTP Error: {e}")
    except requests.exceptions.ConnectionError as e:
        raise Exception(f"Error Connecting: {e}")
    except requests.exceptions.Timeout as e:
        raise Exception(f"Timeout Error: {e}")
    except Exception as e:
        raise Exception(f"Something went wrong: {e}")

def process_rest_step(step, global_headers, global_variables):
    output_variables = {}

    try:
        # Extract http attributes
        http_config = step.get('http', {})
        if not isinstance(http_config, dict):
            raise Exception("Error: 'http' configuration must be a dictionary.")
        
        # -- Method
        method = http_config.get('method').upper()
        if method not in ['GET','PATCH' ,'POST', 'PUT', 'DELETE']:
            raise Exception("Error: Invalid HTTP method.")
        
        # -- URL
        url = http_config.get('url')
        if not url:
            raise Exception("Error: 'url' is required.")
        else:
            url = replace_variables(url, global_variables)

        # -- Headers
        step_headers = record_headers(step)
        total_headers = {**global_headers, **step_headers}

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
                    raise Exception("Error: 'data' must be valid JSON.")
        
        logging.debug('##### Request Inputs #####')
        logging.debug(f"Method: {method}")
        logging.debug(f"URL: {url}")
        logging.debug(f"Headers: {total_headers}")
        logging.debug(f"Body: {body}")

        # Create HTTP request
        response = execute_http_request(method, url, total_headers, body)

        logging.debug('##### Response Outputs #####')
        logging.debug(f"Status Code: {response.status_code}")
        logging.debug(f"Headers: {response.headers}")
        logging.debug(f"Body: {response.text}")

        # Output processing
        output = step.get('outputs', {})
        if not isinstance(output, dict):
            raise Exception("Error: 'output' must be a dictionary.")
        else:
            total_variables = {
                                **global_variables,
                                'today_datetime': datetime.datetime.now().isoformat(),
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
                    jq_filter = jq.compile(value)
                    output_variables[key] = jq_filter.input(total_variables).first()
                except Exception as e:
                    raise Exception(f"Error: Applying jq filter failed - {e}")

        total_variables.update(output_variables)

        # Print processing
        logging.info("#### Printing Variables #####")
        print_statements = step.get('prints', [])
        if not isinstance(print_statements, list):
            raise Exception("Error: 'print' statements must be a list.")
        else:
            for statement in print_statements:
                if statement.startswith('$'):
                    logging.info(f"{statement}: {total_variables.get(statement[1:], 'Variable Not Set')}")
                else:
                    raise Exception("Print variable should start with $")

        # Testcase processing
        logging.info("#### Execute Tests #####")
        test_cases = step.get('tests', [])
        if not isinstance(test_cases, list):
            raise Exception("Error: 'test' cases must be a list.")
        else:
            for test_case in test_cases:
                execute_test_case(test_case,total_variables)

        return output_variables

    except Exception as e:
        raise Exception(f"An error occurred while processing REST step: {e}")

def execute_workflow_steps(workflow, global_headers, global_variables):
    try:
        steps = workflow.get('workflow', {}).get('steps', [])
        
        # Check if steps is a list
        if not isinstance(steps, list):
            raise Exception("Error: 'steps' must be a list.")
        
        # Processing Steps
        for step in steps:
            logging.info(f"### Executing step: {step.get('name')} ###")

            # Determine step type            
            step_type = step.get('type')

            if step_type == 'rest':
                previous_step_output_variables = process_rest_step(step, global_headers, global_variables)
                global_variables.update(previous_step_output_variables)
            else:
                raise Exception(f"Error: Unsupported step type - {step_type}")

    except Exception as e:
        raise Exception(f"An error occurred while executing workflow steps: {e}")

def processYaml(workflow, debugMode=False):

    setup_logging(debugMode)
    
    # Add global headers
    global_headers = record_headers(workflow)

    # Add global variables
    global_variables = record_variables(workflow)

    # Processing steps
    execute_workflow_steps(workflow, global_headers, global_variables)

def run(fileName, debugMode=False):
    setup_logging(debugMode)

    logging.debug('Running HarmonyHub..., '+str(debugMode))
    logging.debug(f'Processing from file - {fileName}')
    
    try:
        # Read the file
        workflow = reading_file(fileName)

        # Process the workflow
        processYaml(workflow,debugMode)

    except Exception as e:
        logging.error(f'Stopped processing workflow {fileName} : {e}')