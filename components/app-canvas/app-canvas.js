// components/app-canvas/app-canvas.js
import { BaseComponent } from '../base/base.js';
import { WorkflowDesigner } from '../../scripts/WorkflowDesigner.js';

class AppCanvas extends BaseComponent {
    constructor() {
        super('app-canvas', 'open');
        this.designer = null;
        this.canvasBackgroundColor = getComputedStyle(document.body).getPropertyValue('--secondary-color');
    }

    async connectedCallback() {
        const shadowRoot = await super.connectedCallback();
        
        setTimeout(() => {
            const appCanvas = shadowRoot.getElementById('appCanvas');
            const workflowCanvas = shadowRoot.getElementById('workflowCanvas');

            if (appCanvas && workflowCanvas) {
                // Initialize WorkflowDesigner
                this.designer = new WorkflowDesigner(workflowCanvas, this.canvasBackgroundColor);

                // Add resize event listener
                this.addEventListener('canvasResize', () => {
                    if (appCanvas) {
                        this.designer.resize(
                            appCanvas.clientWidth,
                            appCanvas.clientHeight - 30
                        );
                    }
                });

                // Initial resize
                appCanvas.dispatchEvent(new CustomEvent('canvasResize', {
                    bubbles: true,
                    composed: true
                }));

                // Separate code for nodes and edges in create-node listener
                document.addEventListener('create-node', (event) => {
                    const { type } = event.detail;
                    if (type === 'line') {
                        this.handleCreateEdge(event);
                    } else {
                        this.handleCreateNode(event);
                    }
                });
            }
        }, 0);
    }

    handleCreateNode(event) {
        const { type } = event.detail;
        const appCanvas = this.shadowRoot.getElementById('appCanvas');
        if (appCanvas && this.designer) {
            const { clientWidth } = appCanvas;
            this.designer.addNode(
                type,
                clientWidth / 2,
                41
            );
        }
    }

    handleCreateEdge(event) {
        const appCanvas = this.shadowRoot.getElementById('appCanvas');
        if (appCanvas && this.designer) {
            this.designer.addEdge();
        }
    }
}

customElements.define('app-canvas', AppCanvas);