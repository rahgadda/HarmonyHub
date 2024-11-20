import yaml
import os

def init(fileName="output.yaml"):
    print('Initializing HarmonyHub...')
    print(f'Creating file - {fileName}')    
    
    workflow = {
        "apiVersion": "v1",
        "kind": "Rest",
        "workflow": {
            "steps": []
        }
    }

    try:
        fileNameExists = os.path.exists(fileName)
        if not(fileNameExists):
            with open(fileName, 'w') as file:
                yaml.dump(workflow, file, default_flow_style=False)
            print(f'Successfully created file {fileName}')
        else:
            print(f'File {fileName} already exists')
    except Exception as e:
        print(f'An error occurred during initialization: {e}')