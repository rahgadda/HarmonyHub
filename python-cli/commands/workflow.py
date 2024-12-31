import logging
import yaml

from src.components.rest import run_rest_flow, evaluate_condition
from src.components.database import run_db_flow
from src.hmh_exception import RestException

class Workflow:

    # Constructor
    def __init__(self, yaml_file: str="", yamlObject: object= None, toolsFile: str = None, debug_mode: bool = False):

        self.yaml_file = yaml_file
        self.workflow_data = yamlObject
        self.toolsFile = toolsFile
        self.debug_mode = debug_mode
        self.global_headers = {}
        self.global_variables = {}
        self.setup_logging()

    # Setup logging
    def setup_logging(self):
        LOG_LEVEL = logging.DEBUG if self.debug_mode else logging.INFO
        logging.basicConfig(format='%(message)s', level=LOG_LEVEL)
        logging.getLogger().setLevel(LOG_LEVEL)

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

    # Load tools file
    def load_tools_file(self):
        self.tools = []

        try:
           with open(self.toolsFile, 'r') as f:
            tools_config = yaml.safe_load(f)
            
           if not isinstance(tools_config, dict):
            raise ValueError("Tools configuration must be a dictionary")
                
           # Convert tools config into list of tool objects
           for tool_name, tool_config in tools_config.items():
               if isinstance(tool_config, dict) and 'id' in tool_config:
                   if not tool_config.get('id'):
                     raise ValueError("Tool id is required")
                   if int(tool_config.get('id')) < 1:
                     raise ValueError("Tool id is invalid") 
                   if not tool_config.get('type'):
                     raise ValueError("Tool type is required")
                   if not tool_config.get('description'):
                     raise ValueError("Tool description is required") 
                   if not tool_config.get('svg'):
                     raise ValueError("Tool svg is required") 
                   if not tool_config.get('category'):
                     raise ValueError("Tool category is required")
                   if not tool_config.get('properties'):
                     raise ValueError("Tool properties are required")

                   self.tools.append(tool_config)
               else:
                   raise Exception(f"Warning: Invalid tool configuration for {tool_name}")
            
           logging.debug(f"Tools file loaded: {self.toolsFile}")
        
        except FileNotFoundError:
            raise Exception(f'File {self.toolsFile} not found')
        except yaml.YAMLError as e:
            raise Exception(f"Error: Parsing YAML failed - {e}")
        except Exception as e:
            raise Exception(f"An error occurred: {e}")

    # Load workflow file
    def reading_file(self):
        self.workflow_data = None

        try:
            with open(self.yaml_file, 'r') as file:
                self.workflow_data = yaml.safe_load(file)
                            
            # Validate basic structure
            if not self.workflow_data.get('apiVersion') == 'v1':
                raise ValueError("Invalid API version")
            if not self.workflow_data.get('kind') == 'harmonyhub-workflow':
                raise ValueError("Invalid workflow kind")
            if not self.workflow_data.get('workflow', {}).get('steps'):
                raise ValueError("No workflow steps defined")
            
            logging.debug(f"Workflow file loaded: {self.yaml_file}")

            return self.workflow_data
        
        except FileNotFoundError:
            raise Exception(f'File {self.yaml_file} not found')
        except yaml.YAMLError as e:
            raise Exception(f"Error: Parsing YAML failed - {e}")
        except Exception as e:
            raise Exception(f"An error occurred: {e}")

    # Record Headers
    def record_headers(self, flow=None):
        try:
            if flow is None:
                flow = self.workflow_data

            headers = flow.get('headers', {})

            if not headers:
                return
            elif not isinstance(headers, dict):
                raise Exception("Error: 'headers' must be a dictionary.")

            # Replace header values with global variables if they exist
            for key, value in headers.items():
                if isinstance(value, str):
                    headers[key] = Workflow.replace_variables(headers[key], self.global_variables, logging)
                       
            logging.debug(f"Added Headers: {headers}")

            self.global_headers.update(headers)
        except Exception as e:
            raise Exception(f"An error occurred while extracting headers: {e}")

    # Record Variables
    def record_variables(self, flow=None):
        try:

            if flow is None:
                flow = self.workflow_data
            
            variables = flow.get('variables', {})

            if not variables:
                return  
            elif not isinstance(variables, dict):
                raise Exception("Error: 'variables' must be a dictionary.")

            logging.debug(f"Added Variables: {variables}")

            self.global_variables.update(variables)

        except Exception as e:
            raise Exception(f"An error occurred while extracting variables: {e}")
    
    # Execute step
    def execute_step(self, step, messageDetails:list = [], debugMode: bool = False):
        try:
            logging.info(f"\nExecuting step: {step.get('id')} of type {step.get('type')}\n")
            messageDetails.append({
                "type" : step.get('type'),
                "details" : f"Executing step: {step.get('id')} of type {step.get('type')}"
            })

            # -- Check if step type is valid
            match step.get('type'):
                case 'restapi':
                    # -- Execute RestAPI Step
                    rest_output_variables,messageDetails = run_rest_flow(step, messageDetails, debugMode, self.global_headers, self.global_variables, logging)
                    self.global_variables.update(rest_output_variables)

                case 'database':
                    # -- Execute Database Step
                    db_output_variables,messageDetails = run_db_flow(step, messageDetails, self.global_variables, logging)
                    self.global_variables.update(db_output_variables)

                case 'switch':
                    # -- Execute Switch Step
                    # print("Switch Step")
                    # print(step.get('cases', []))
                    
                    switch_steps = step.get('cases', [])

                    if isinstance(switch_steps, list):
                        for step in switch_steps:
                            # print(step.get('condition'))
                            if evaluate_condition(step.get('condition'), self.global_variables):
                                for sub_step in step.get('steps', []):
                                    self.execute_step(sub_step, messageDetails, debugMode)
                    else:
                        raise Exception("Error: 'cases' must be a dict.")
                    
                case 'loop':
                    # -- Execute Loop Step
                    # print("Loop Step")
                    # print(step.get('iterations', []))
                    
                    iterations_steps = step.get('iterations', [])

                    if isinstance(iterations_steps, list):
                        for step in iterations_steps:
                            # print(step.get('condition'))
                            while evaluate_condition(step.get('condition'), self.global_variables):
                                for sub_step in step.get('steps', []):
                                    self.execute_step(sub_step, messageDetails, debugMode)
                    else:
                        raise Exception("Error: 'iterations' must be a dict.")
                    
                case 'errorhandler':
                    # -- Execute Error Step
                    # print("Error Handler Step")

                    errorhandler_steps = step.get('errorhandler', [])
                    if isinstance(errorhandler_steps, list):
                        # Get try step
                        try_steps = next((s for s in errorhandler_steps if s.get('name') == 'try'), None)
                        # print(f"Try Steps: ${try_steps}")

                        # Iterate all catch steps and record condition in array
                        catch_steps = [s for s in errorhandler_steps if s.get('name') == 'catch']
                        
                        if try_steps:
                            try:
                                logging.info(f"Executing Try Steps")
                                for try_step in try_steps.get('steps', []):
                                    self.execute_step(try_step, messageDetails, debugMode)
                            except RestException as e:
                                conditionMet = False
                                
                                logging.info(f"Executing Catch Steps")
                                logging.debug(f"Catch ErrorCode: {e.status_code}")

                                # Check if the error status code matches any catch condition
                                for catch_step in catch_steps:
                                    logging.debug(f"Catch Step: {catch_step}")
                                    logging.debug(f"Error Status Code: {e.status_code}")
                                    logging.debug(f"Catch Condition: {catch_step.get('condition')}")

                                    if str(e.status_code) == str(catch_step.get('condition')):
                                        conditionMet = True
                                        for catch_sub_step in catch_step.get('steps', []):
                                            # print(f"Catch Sub Steps: ${catch_sub_step}")
                                            self.execute_step(catch_sub_step, messageDetails, debugMode)  
                                        break
                                
                                if not conditionMet:
                                   raise Exception(f"Error: No catch for status code - {e.status_code}") 
                        else:
                            raise Exception("Error: 'try' step not found in errorhandler steps.")

                case 'harmonyhub-integration':
                    # -- Execute Integration Step
                    # print("Integration Step")

                    # -- Add Variables
                    self.record_variables(step)

                    # -- Add Headers
                    self.record_headers(step)

                    # -- Execute Integration Step
                    # print("Executing HarmonyHub Integration Step", step)

                    integration_step = step.get('steps', [])

                    # Replace Integration Step if latest tool is available
                    if self.tools:
                        for tool in self.tools:
                            logging.debug(f"Checking For Replacement Tool ID: {tool.get('id')}")
                            if int(tool.get('id')) == int(step.get('toolid')):
                                logging.info(f"Replacement Tool Found: {tool.get('id')}")
                                for property in tool.get('properties'):
                                    if property.get('field') == 'steps':
                                        logging.debug(f"Replacing Integration Step: \nToolFile Value: {property.get('value')}\nStep Value: {step.get('steps', [])}")
                                        messageDetails.append({
                                            "type" : "tool-step-replace",
                                            "details" : property.get('value')
                                        })
                                        integration_step = property.get('value')
                        

                    # -- Execute SubWorkflow Steps
                    if isinstance(integration_step,list):
                        self.execute_workflow_steps(integration_step, messageDetails, debugMode)
                    else:
                        self.execute_step(integration_step, messageDetails, debugMode)

                case _:
                    raise Exception(f"Error: Invalid step type {step.get('type')}")
        except RestException as e:
            # print(f"RestException: {e.message}, {e.status_code} ")
            raise e
        except Exception as e:
            raise Exception(f"An error occurred while executing workflow steps: {e}")

    # Execute Workflow Steps
    def execute_workflow_steps(self, steps, messageDetails, debugMode):
        try:

            # -- Check if steps is a list
            if not isinstance(steps, list):
                raise Exception("Error: 'steps' must be a list.")

            # -- Loop through each step
            for step in steps:
                self.execute_step(step, messageDetails, debugMode)

        except Exception as e:
            raise Exception(f"An error occurred while executing workflow steps: {e}")
