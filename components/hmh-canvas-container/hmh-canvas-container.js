import { BaseComponent } from '../base/base.js';
import { WorkflowDesigner } from '../../scripts/WorkflowDesigner.js';

class HMHCanvas extends BaseComponent {
    constructor() {
        super('hmh-canvas-container');
        this.workflowDesigner = null;
        this.bodyStyler = getComputedStyle(document.body);
    }

    async connectedCallback() {
        const shadowRoot = await super.connectedCallback();

        // Initialize Fabric.js canvas
        const hmhCanvas = shadowRoot.getElementById('hmhCanvas');
        const hmhCanvasContainer = shadowRoot.getElementById('hmhCanvasContainer');
        
        hmhCanvas.width = hmhCanvasContainer.clientWidth;
        hmhCanvas.height = hmhCanvasContainer.clientHeight;

        this.workflowDesigner = new WorkflowDesigner(hmhCanvas, hmhCanvasContainer, this.bodyStyler);
        this.workflowDesigner.createCanvas();

        // Add Event Listener
        window.addEventListener('tool-selected', (e) => {

            // Calculate center position
            const centerX = hmhCanvas.width / 2;

            try {

                // Convert SVG string to path data
                const svg = e.detail.tool.svg;

                // console.log("Tool ",e.detail.tool)
                
                if (e.detail.tool.type !== "harmonyhub-integration"){
                    this.workflowDesigner.addNodeToCanvas(
                        centerX - centerX/3,
                        130,
                        e.detail.tool.description,
                        e.detail.tool.type,
                        svg,
                        e.detail.tool.properties
                    );
                }else{
                    this.workflowDesigner.addIntegrationNodeToCanvas(
                        centerX - centerX/3,
                        130,
                        e.detail.tool.description,
                        e.detail.tool.type,
                        svg,
                        e.detail.tool
                    );
                }

                // console.log('Node added:', e.detail.tool.description);
            } catch (error) {
                console.error('Error adding node:', error);
            }   
        });
    }
}

customElements.define('hmh-canvas-container', HMHCanvas);
