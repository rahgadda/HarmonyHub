import { BaseComponent } from '../base/base.js';

class AppProperties extends BaseComponent {
    constructor() {
        super('app-properties', 'open');

        this.selectedNode = null;
        this.canvas = null;
    }

    async connectedCallback() {
        const shadowRoot = await super.connectedCallback();
        this.propertiesContent = shadowRoot.getElementById('propertiesContent');

        // Listen for custom events to update properties
        document.addEventListener('node-selected', (event) => {
            this.selectedNode = event.detail.node;
            this.displayNodeProperties(event.detail.node);
            this.propertiesContent.insertAdjacentHTML('beforeend', this.createSaveButton());
            this.propertiesContent.querySelector('#saveButton').addEventListener('click', () => this.saveNodeProperties());
        });

        document.addEventListener('canvas-selected', (event) => {
            this.canvas = event.detail.canvas;
            this.displayCanvasProperties(event.detail.canvas);
            this.propertiesContent.insertAdjacentHTML('beforeend', this.createSaveButton());
            this.propertiesContent.querySelector('#saveButton').addEventListener('click', () => this.saveCanvasProperties());
        });
    }

    displayNodeProperties(node) {
        if (!node) return;
        this.propertiesContent.innerHTML = `
            <p>Select a node or workflow to edit properties</p>
            <h3>Node Properties</h3>
        `;
        node.properties.forEach(property => {
            switch (property.datatype) {
                case 'Text':
                    this.propertiesContent.innerHTML += this.createTextInput(property.name, property.value, property.hint);
                    break;
                case 'TextLarge':
                    this.propertiesContent.innerHTML += this.createTextArea(property.name, property.value, property.hint);
                    break;
                case 'Enumeration':
                    this.propertiesContent.innerHTML += this.createSelectInput(property.name, property.options, property.value, property.hint);
                    break;
                case 'Array':
                    this.propertiesContent.innerHTML += this.createTextArea(property.name, property.value.join(',\n'), property.hint);
                    break;
                case 'Object':
                    this.propertiesContent.innerHTML += this.createTextArea(property.name, Object.keys(property.value).length !== 0 ? JSON.stringify(property.value, null, 2) : '', property.hint);
                    break;
                case 'ArrayObject':
                    this.propertiesContent.innerHTML += this.createTextArea(property.name, property.value.map(
                        element => JSON.stringify(element, null, 2)
                    ), property.hint);
                    break;
                default:
                    break;
            }
        });
    }

    displayCanvasProperties(canvas) {
        if (!canvas) return;
        this.propertiesContent.innerHTML = `
            <p>Select a node or workflow to edit properties</p>
            <h3>Workflow Properties</h3>
            ${this.createTextArea('Metadata', Object.keys(canvas.metadata).length !== 0 ? JSON.stringify(canvas.metadata, null, 2): '', 'Enter metadata {}')}
            ${this.createTextArea('Variables', Object.keys(canvas.variables).length !== 0 ? JSON.stringify(canvas.variables, null, 2): '', 'Enter variables {}')}
            ${this.createTextArea('Headers', Object.keys(canvas.headers).length !== 0 ? JSON.stringify(canvas.headers, null, 2): '', 'Enter headers {}')}
        `;
    }

    createSaveButton() {
        return `
            <button id="saveButton">Save</button>
        `;
    }

    saveNodeProperties() {
        if (!this.selectedNode) return;


        this.selectedNode.properties.forEach(property => {
            const inputElement = this.propertiesContent.querySelector(`[data-property-name="${property.name}"]`);

            // console.log('Property '+property.name+' is getting saved as '+inputElement.value);

            if (inputElement.value === '' && !property.required) 
                return;
            else if (inputElement.value === '' && property.required) {
                console.error('Required property '+property.name+' is null');
                window.alert('Required property '+property.name+' is null');
            }
            else if (!(inputElement.value === '')) {
                // console.log('Property '+property.name+' is getting saved as '+inputElement.value);
                switch (property.datatype) {
                    case 'Text':
                        property.value = inputElement.value;
                        break;
                    case 'TextLarge':
                        property.value = inputElement.value;
                        break;
                    case 'Enumeration':
                        property.value = inputElement.value;
                        break;
                    case 'Array':
                        property.value = inputElement.value.split(',\n');
                        break;
                    case 'Object':
                        try {
                            property.value = JSON.parse(inputElement.value);
                        } catch (error) {
                            console.error('Invalid JSON in property', property.name);
                            window.alert('Invalid JSON property '+property.name);
                        }
                    case 'ArrayObject':
                        try {
                            const arrayObject = Array(inputElement.value)
                            property.value = arrayObject.map(element => {
                                return JSON.parse(element);
                            });
                            //console.log('ArrayObject property '+property.name+' is getting saved as '+property.value.forEach(element => console.log(element)));
                        } catch (error) {
                            console.error('Invalid JSON in property', property.name);
                            window.alert('Invalid JSON property '+property.name);
                        }
                        break;
                    default:
                        break;
                }
            }
        });

        this.dispatchEvent(
            new CustomEvent('node-properties-saved', {
                detail: { node: this.selectedNode },
                bubbles: true,
                composed: true
            })
        );
    }

    saveCanvasProperties() {
        if (!this.canvas) return;
        const metadataTextarea = this.propertiesContent.querySelector('textarea[class="Metadata"]');
        const variablesTextarea = this.propertiesContent.querySelector('textarea[class="Variables"]');
        const headersTextarea = this.propertiesContent.querySelector('textarea[class="Headers"]');

        try {
            this.canvas.metadata = JSON.parse(metadataTextarea.value);
            this.canvas.variables = JSON.parse(variablesTextarea.value);
            this.canvas.headers = JSON.parse(headersTextarea.value);
        } catch (error) {
            console.error('Invalid JSON in canvas properties');
        }

        this.dispatchEvent(
            new CustomEvent('canvas-properties-saved', {
                detail: { canvas: this.canvas },
                bubbles: true,
                composed: true
            })
        );
    }

    createTextInput(label, value, hint) {
        return `
            <div class="property">
                <label>${label}</label>
                <input type="text" class="${label}" data-property-name="${label}" value="${value || ''}" placeholder="${hint || ''}">
            </div>
        `;
    }

    createTextArea(label, value, hint) {
        return `
            <div class="property">
                <label>${label}</label>
                <textarea class="${label}" data-property-name="${label}" placeholder="${hint || ''}">${value || ''}</textarea>
            </div>
        `;
    }

    createSelectInput(label, options, value, hint) {
        const optionsHtml = options.map(option => `<option value="${option}" ${option === value ? 'selected' : ''}>${option}</option>`).join('');
        return `
            <div class="property">
                <label>${label}</label>
                <select class="${label}" data-property-name="${label}">
                    ${optionsHtml}
                </select>
            </div>
        `;
    }
}

customElements.define('app-properties', AppProperties);