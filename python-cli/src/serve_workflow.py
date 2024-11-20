from fastapi import FastAPI, UploadFile, HTTPException
from fastapi.responses import JSONResponse
import uvicorn
import yaml
from .run_workflow import processYaml

app = FastAPI(
    title="YAML Workflow Processor",
    description="API service for processing YAML workflow files",
    version="1.0.0"
)

@app.post("/run")
async def run_workflow(file: UploadFile):
    try:
        # Validate file extension
        if not file.filename.endswith(('.yaml', '.yml')):
            raise HTTPException(
                status_code=400,
                detail="File must be a YAML file"
            )
        
        # Read file content
        content = await file.read()
        
        # Parse YAML content
        try:
            yaml_object = yaml.safe_load(content)
        except yaml.YAMLError as e:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid YAML format: {str(e)}"
            )
        
        # Process the YAML object
        try:
            result = processYaml(yaml_object)
            return JSONResponse(
                content={"result": result},
                status_code=200
            )
        except Exception as e:
            raise HTTPException(
                status_code=500,
                detail=f"Error processing YAML: {str(e)}"
            )
            
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Server error: {str(e)}"
        )

@app.get("/")
async def root():
    """Health check endpoint"""
    return {"status": "healthy"}

def serve(port: int, debugFlag: bool):
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=port
    )