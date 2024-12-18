from .workflow import Workflow
import logging
from fastapi import FastAPI, UploadFile, HTTPException
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import yaml

from src.hmh_exception import RestException

# FastAPI instance
app = FastAPI(
    title="YAML Workflow Processor",
    description="API service for processing YAML workflow files",
    version="1.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Setup logging
def setup_logging(debugMode: bool = False):
    LOG_LEVEL = logging.DEBUG if debugMode else logging.INFO
    logging.basicConfig(format='%(message)s', level=LOG_LEVEL)
    logging.getLogger().setLevel(LOG_LEVEL)

# Health check endpoint
@app.get("/")
async def root():
    """Health check endpoint"""
    return {"status": "healthy"}

# Run workflow endpoint
@app.post("/run")
async def serve_workflow(file: UploadFile, debugMode: bool = False):
    
    httpResponse = ()
    messageDetails = []
    
    try:

        setup_logging(debugMode)

        # Validate file extension
        if not file.filename.endswith(('.yaml', '.yml')):
            raise HTTPException(
                status_code=400,
                detail="File must be a YAML file"
            )
    
        # Read file content
        yamlContent = await file.read()

        # Parse YAML content
        try:
            yamlObject = yaml.safe_load(yamlContent)
        except yaml.YAMLError as e:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid YAML format: {str(e)}"
            )

        workflow = Workflow(yamlObject=yamlObject, debug_mode=debugMode)
        workflow.record_headers()
        if(debugMode):
            messageDetails.append({
                "type" : "header",
                "details" : workflow.global_headers 
            })

        workflow.record_variables()
        if(debugMode):
            messageDetails.append({
                "type" : "variables",
                "details" : workflow.global_variables
            })

        steps = workflow.workflow_data.get('workflow', {}).get('steps')
        if(debugMode):
            messageDetails.append({
                "type" : "workflow",
                "details" : steps
            })

        logging.info(f"Executing workflow steps...")
        messageDetails.append({
            "type" : "workflow",
            "details" : "Executing workflow steps..."
        })
        workflow.execute_workflow_steps(steps, messageDetails, debugMode)
        messageDetails.append({
            "type" : "workflow",
            "details" : "Executed workflow steps successfully"
        })

        httpResponse = JSONResponse(
            content={"result": messageDetails},
            status_code=200
        )

    except RestException as e:
        logging.error(f"Error: {e}")
        httpResponse = JSONResponse(
            content={"error": {e.message}},
            status_code={e.status_code}
        )    
    except Exception as e:
        logging.error(f"Error: {e}")
        httpResponse = JSONResponse(
            content={"error": str(e)},
            status_code=500
        )

    return httpResponse

def serve(port: int, debugFlag: bool):
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=port
    )