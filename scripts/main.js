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
        // Handle workflow execution
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