import { BaseComponent } from '../base/base.js';

class HMHViewYaml extends BaseComponent {
    constructor() {
        super('hmh-viewyaml');
        this.yaml = '';
    }

    async connectedCallback() {
        const shadowRoot = await super.connectedCallback();
        if (shadowRoot) {
            this.setupEventListeners(shadowRoot);
        }

        // YAML show event
        document.addEventListener('show-yaml', (e) => {
            if (e.detail?.yaml) {
                this.yaml = e.detail.yaml;
                this.displayYaml(shadowRoot, e.detail.yaml);
            }
        });
    }

    setupEventListeners(shadowRoot) {
        const popupOverlay = shadowRoot.getElementById('hmhViewYaml');
        const copyButton = shadowRoot.getElementById('copyButton');
        const downloadButton = shadowRoot.getElementById('downloadButton');
        const exportButton = shadowRoot.getElementById('exportButton');
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

        // Export functionality
        exportButton.addEventListener('click', () => {
            // console.log('Yaml:', this.yaml);
            let yamlObject = jsyaml.load(this.yaml);
           
            let exportYamlObject = {};

            console.log(yamlObject.variables);

            let objectName = yamlObject.name.charAt(0).toUpperCase() + yamlObject.name.slice(1);

            exportYamlObject[objectName + "Tool"] = {
                id: 0,
                type: "harmonyhub-integration",
                description: yamlObject.description,
                svg: yamlObject.svg,
                category: "Integration",
                properties: [{
                    name: 'Name',
                    field: 'name',
                    datatype: 'Text',
                    required: true,
                    hint: 'Enter value for Name',
                    value: yamlObject.description,
                    readOnly: false
                }]
            };

            if (yamlObject.headers) {
                exportYamlObject[objectName + "Tool"].properties.push({
                    name: 'Headers',
                    field: 'headers',
                    datatype: 'Object',
                    required: false,
                    hint: 'Enter '+objectName+' Headers {}',
                    value: yamlObject.headers,
                    readOnly: false
                });
            }

            if (yamlObject.variables) {
                exportYamlObject[objectName + "Tool"].properties.push({
                    name: 'Variables',
                    field: 'variables',
                    datatype: 'Object',
                    required: false,
                    hint: 'Enter '+objectName+' Variables {}',
                    value: yamlObject.variables,
                    readOnly: false
                });
            }

            exportYamlObject[objectName + "Tool"].properties.push({
                name: 'Steps',
                field: 'steps',
                datatype: 'ArrayObject',
                required: true,
                hint: 'Enter '+objectName+' for Steps',
                value: yamlObject.workflow.steps,
                readOnly: false 
            });

            console.log(jsyaml.dump(exportYamlObject));

            const blob = new Blob([jsyaml.dump(exportYamlObject)], {type: 'text/yaml'});
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = yamlObject.name.charAt(0).toUpperCase() + yamlObject.name.slice(1) + "Tool"+'.yaml';
            a.click();
            URL.revokeObjectURL(url);
        });

        // Run functionality (placeholder)
        runButton.addEventListener('click', () => {
            console.log('TBD: Run functionality');
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