import { BaseComponent } from '../base/base.js';

class AppMain extends BaseComponent {
    constructor() {
        super('app-main','open');
    }

    async connectedCallback() {
        // Wait for shadow DOM to be ready
        const shadowRoot = await super.connectedCallback();
        setTimeout(() => {
            
            // Get elements from shadow DOM
            const appCanvas = shadowRoot.querySelector('app-canvas');
            const appYaml = shadowRoot.querySelector('app-yaml');
            const designBtn = shadowRoot.getElementById('designBtn');
            const yamlBtn = shadowRoot.getElementById('yamlBtn');
            const runBtn = shadowRoot.getElementById('runBtn');

            // Adding Design Button Click Event Listeners
            designBtn?.addEventListener('click', () => {
                
                // Enable Canvas View
                appCanvas.classList.remove('hidden');
                appYaml.classList.remove('visible');
                
                
                // Dispatch Custom Event - Main.js
                this.dispatchEvent(new CustomEvent('design-click', {
                    bubbles: true,
                    composed: true
                }));
            });

            // Adding Yaml Button Click Event Listeners
            yamlBtn?.addEventListener('click', () => {
                
                // Enable Yaml View
                appCanvas.classList.add('hidden');
                appYaml.classList.add('visible');
                
                appYaml.dispatchEvent(new CustomEvent('yaml-visible', {
                    bubbles: true,
                    composed: true
                }));
                
                this.dispatchEvent(new CustomEvent('yaml-click', {
                    bubbles: true,
                    composed: true
                }));
            });

            // Adding Run Button Click Event Listeners
            runBtn?.addEventListener('click', () => {
                this.dispatchEvent(new CustomEvent('run-click', {
                    bubbles: true,
                    composed: true
                }));
            });

        }, 0);
    }
}

customElements.define('app-main', AppMain);