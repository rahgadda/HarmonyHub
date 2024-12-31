from .workflow import Workflow
import logging

# Setup logging
def setup_logging(debug_mode: bool = False):
    LOG_LEVEL = logging.DEBUG if debug_mode else logging.INFO
    logging.basicConfig(format='%(message)s', level=LOG_LEVEL)
    logging.getLogger().setLevel(LOG_LEVEL)

def run_workflow(yaml_file: str, toolsFile: str = None,debug_mode: bool = False):
    try:
        setup_logging(debug_mode)

        workflow = Workflow(yaml_file=yaml_file, toolsFile=toolsFile ,debug_mode=debug_mode)
        workflow.reading_file()
        if toolsFile:
            workflow.load_tools_file()
        workflow.record_variables()
        workflow.record_headers()

        steps = workflow.workflow_data.get('workflow', {}).get('steps')

        logging.info(f"Executing workflow steps...")
        workflow.execute_workflow_steps(steps,[],debug_mode)

    except Exception as e:
        logging.error(f"Error: {e}")