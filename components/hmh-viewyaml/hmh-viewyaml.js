import { BaseComponent } from '../base/base.js';

class HMHViewYaml extends BaseComponent {
    constructor() {
        super('hmh-viewyaml');
    }

    async connectedCallback() {
        const shadowRoot = await super.connectedCallback();
        if (shadowRoot) {
            this.setupEventListeners(shadowRoot);
        }

        // YAML show event
        document.addEventListener('show-yaml', (e) => {
            if (e.detail?.yaml) {
                this.displayYaml(shadowRoot, e.detail.yaml);
            }
        });
    }

    setupEventListeners(shadowRoot) {
        const popupOverlay = shadowRoot.getElementById('hmhViewYaml');
        const copyButton = shadowRoot.getElementById('copyButton');
        const downloadButton = shadowRoot.getElementById('downloadButton');
        const runButton = shadowRoot.getElementById('runButton');
        const closePopup = shadowRoot.getElementById('closePopup');
        const copyMessage = shadowRoot.getElementById('copyMessage');
        const yamlDisplay = shadowRoot.getElementById('yamlDisplay');

        // Copy functionality
        copyButton.addEventListener('click', () => {
            navigator.clipboard.writeText(yamlDisplay.textContent).then(() => {
                copyMessage.textContent = '✓ Copied!';
                copyMessage.style.opacity = '1';
                setTimeout(() => {
                    copyMessage.style.opacity = '0';
                }, 2000);
            });
        });

        // Download functionality
        downloadButton.addEventListener('click', () => {
            const blob = new Blob([yamlDisplay.textContent], {type: 'text/yaml'});
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'yaml-content.yaml';
            a.click();
            URL.revokeObjectURL(url);
        });

        // Run functionality (placeholder)
        runButton.addEventListener('click', () => {
            alert('Run functionality not implemented. You can customize this based on your specific YAML processing needs.');
        });

        // Close popup
        closePopup.addEventListener('click', () => {
            popupOverlay.style.display = 'none';
        });

        // Close popup if clicking outside the content
        popupOverlay.addEventListener('click', (event) => {
            if (event.target === popupOverlay) {
                popupOverlay.style.display = 'none';
            }
        });
    }

    displayYaml(shadowRoot, content) {
        const popupOverlay = shadowRoot.getElementById('hmhViewYaml');
        const lineNumbers = shadowRoot.getElementById('lineNumbers');
        const yamlDisplay = shadowRoot.getElementById('yamlDisplay');
        
        // Clear previous line numbers
        lineNumbers.innerHTML = '<div></div>';
        
        // Add line numbers
        const lines = content.split('\n');
        lines.forEach((_, index) => {
            const lineNum = document.createElement('div');
            lineNum.textContent = index + 1;
            lineNumbers.appendChild(lineNum);
        });

        // Display YAML content
        yamlDisplay.textContent = content;
        popupOverlay.style.display = 'block';
    }

}

customElements.define('hmh-viewyaml', HMHViewYaml);