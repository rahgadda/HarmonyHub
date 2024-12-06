window.yamlString = "apiVersion: v1 \n\
kind: Rest \n \
metadata:\n \
variables: \n \
headers: \n \
workflow: \n \
  steps:";

document.addEventListener('DOMContentLoaded', () => {
    const appMain = document.querySelector('app-main');
    
    if (!appMain) {
        console.error('app-main not found');
        return
    }

    // Listen for hamburger menu toggle events
    document.addEventListener('app-hamburger-toggle', (event) => {
        
        if (!appMain || !appMain.shadowRoot) {
            console.error('app-main or its shadow root not found');
            return;
        }

        // Then access app-tools through app-main's shadow DOM
        const toolsPanel = appMain.shadowRoot.querySelector('app-tools');
        const propertiesPanel = appMain.shadowRoot.querySelector('app-properties');
        const canvasPanel = appMain.shadowRoot.querySelector('app-canvas');

        if (!toolsPanel || !propertiesPanel || !canvasPanel) {
            console.error('One or more panels not found in app-main');
            return;
        }

        // Toggle panels visibility
        toolsPanel.classList.toggle('hidden');
        propertiesPanel.classList.toggle('hidden');
        canvasPanel.classList.toggle('expanded');

        // Resize canvas
        if (appMain && appMain.shadowRoot) {
            const appCanvas = appMain.shadowRoot.querySelector('app-canvas');
            if (appCanvas) {
                // Dispatch custom event to app-canvas
                appCanvas.dispatchEvent(new CustomEvent('canvasResize', {
                    bubbles: true,
                    composed: true
                }));
            }
        }
    });

    // Design Button Events Handling
    // document.addEventListener('design-click', (event) => {
    //     console.log('Design button clicked');
    //     // Handle design mode
    // });

    // Yaml Button Events Handling
    // document.addEventListener('yaml-click', (event) => {
    //     console.log('YAML button clicked');
    //     // Handle YAML view
    // });

    // Run Button Events Handling
    document.addEventListener('run-click', (event) => {
        console.log('Run button clicked');
    
        // Calling python harmony-cli
        const yamlInput = window.yamlString;
        try {
                // Parse YAML input from textarea
                const yamlObject = jsyaml.load(yamlInput);
                
                processYamlWorkflow(yamlObject)
                .then(result => {
                    console.log(JSON.stringify(result, null, 2));
                })
                .catch(error => {
                    console.error(error.message);
                });

            } catch (e) {
                document.getElementById('result').textContent = 
                    `YAML parsing error: ${e.message}`;
            }
    });

    // Add Yaml/Canvas Resize
    window.addEventListener('resize', () => { 
        if (!appMain || !appMain.shadowRoot) {
            console.error('app-main or its shadow root not found');
            return;
        }
        const appCanvas = appMain.shadowRoot.querySelector('app-canvas');
        
        if (!appCanvas) {
            console.error('app-canvas not found');
            return;
        }else{
            appCanvas.dispatchEvent(new CustomEvent('canvasResize', {
                bubbles: true,
                composed: true
            }));
        }
    });
})

async function processYamlWorkflow(yamlObject) {
    try {
        // Convert YAML object to string
        const yamlString = jsyaml.dump(yamlObject);
        
        // Create blob from YAML string
        const yamlBlob = new Blob([yamlString], { type: 'application/x-yaml' });
        
        // Create form data
        const formData = new FormData();
        formData.append('file', yamlBlob, 'workflow.yaml');

        // Make the fetch call
        const response = await fetch('http://localhost:9087/run', {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        return result;
    } catch (error) {
        console.error('Error processing workflow:', error);
        throw error;
    }
}
