import { BaseComponent } from '../base/base.js';


class HMHProperties extends BaseComponent {
    constructor() {
        super('hmh-properties');
        this.propertiesContent = null
        this.isScrolling = false;
        this.lastY = 0;
        this.scrollTop = 0;
    }

    async connectedCallback() {
        const shadowRoot = await super.connectedCallback();
        this.propertiesContent = shadowRoot.getElementById('propertiesContent');
        this.setupScrollHandlers(shadowRoot);

        // Load properties
        document.addEventListener('node-selected', (event) => {
            const node = event.detail.node;
            // console.log('Node selected', node.properties);
           
            // Update global focus state
            window.focusState = {
                current: 'node',
                previous: window.focusState.current,
                selectedNode: node,
                selectedEdge: null,
                selectedCanvas: null,
                onPropertyPallet: false
            };
            this.displayNone();
            this.displayProperties(node, node.group.customType);
        });

        document.addEventListener('canvas-selected', (event) => {
            const canvas = event.detail.canvas;
            // console.log('Canvas selected', canvas.properties);
            
            // Update global focus state
            window.focusState = {
                current: 'canvas',
                previous: window.focusState.current,
                selectedNode: null,
                selectedEdge: null,
                selectedCanvas: canvas,
                onPropertyPallet: false
            };
            this.displayNone();
            if (canvas)
                this.displayProperties(canvas, 'canvas');
        });

        document.addEventListener('edge-selected', (event) => {
            const edge = event.detail.edge;
            // console.log('Edge selected', edge.properties);
            
            // Update global focus state
            window.focusState = {
                current: 'edge',
                previous: window.focusState.current,
                selectedNode: null,
                selectedEdge: edge,
                selectedCanvas: null,
                onPropertyPallet: false
            };
            this.displayNone();
            
            if (edge)
                this.displayProperties(edge, 'edge');
        });

        document.addEventListener('deleted-attribute', (event) => {
            const canvas = event.detail.canvas;
            // console.log('Deleted attribute', canvas.properties);
   
            // Update global focus state
            window.focusState = {
                current: 'canvas',
                previous: window.focusState.current,
                selectedNode: null,
                selectedEdge: null,
                selectedCanvas: canvas,
                onPropertyPallet: false
            };

            this.displayNone();
        });

        
        document.addEventListener('save-attributes', (event) => {
           this.updateProperties();
        });
    }

    setupScrollHandlers(shadowRoot) {
        const container = shadowRoot.querySelector('.hmh-properties');

        container.addEventListener('mousedown', (e) => {
            this.isScrolling = true;
            this.lastY = e.clientY;
            this.scrollTop = container.scrollTop;
            container.style.cursor = 'grabbing';
        });

        container.addEventListener('mousemove', (e) => {
            if (!this.isScrolling) return;
            
            const delta = this.lastY - e.clientY;
            container.scrollTop = this.scrollTop + delta;
            
            // Prevent text selection while scrolling
            e.preventDefault();
        });

        // Handle mouse up and mouse leave
        const stopScrolling = () => {
            this.isScrolling = false;
            container.style.cursor = '';
        };

        container.addEventListener('mouseup', stopScrolling);
        container.addEventListener('mouseleave', stopScrolling);
    }

    displayNone(){
        this.propertiesContent.innerHTML =`
        <p>Select to edit properties</p>`;
    }

    displayProperties(object, type) {
        if (!object) 
            return;
        // else
        //     console.log('Display properties for', object.getPropertyValue('id'));

        switch (type) {
            case 'node':
                this.propertiesContent.innerHTML = `
                <h4>Tool Properties</h3>
                `;
                break;
            case 'integration':
                this.propertiesContent.innerHTML = `
                <h4>Integration Properties</h3>
                `;
                break;
            case 'canvas':
                this.propertiesContent.innerHTML = `
                <h4>Workflow Properties</h4>
                `;
                break;
            case 'edge':
                this.propertiesContent.innerHTML = `
                <h4>Connector Properties</h4>
                `;
                break;
            default:
                this.propertiesContent.innerHTML =`
                <p>Select to edit properties</p>`;
                break;
        }



        object.properties.forEach(property => {            
            // console.log('Property '+property.name+' is getting loaded as '+property.value);
            switch (property.datatype) {
                case 'Text':
                    this.propertiesContent.innerHTML += this.createTextInput(property.name, property.value, property.hint, property.readOnly);
                    break;
                case 'TextLarge':
                    this.propertiesContent.innerHTML += this.createTextArea(property.name, property.value, property.hint, property.readOnly);
                    break;
                case 'Enumeration':
                    this.propertiesContent.innerHTML += this.createSelectInput(property.name, property.options, property.value, property.hint, property.readOnly);
                    break;
                case 'SVG':
                    this.propertiesContent.innerHTML += this.createSVGViewBox(property.name, Object.keys(property.value).length !== 0 ? JSON.stringify(property.value, null, 2) : '', property.hint, property.readOnly);
                    break;
                case 'PNG':
                    this.propertiesContent.innerHTML += this.createBase64PngViewBox(property.name, property.value, property.hint, property.readOnly);
                    break;
                case 'Array':
                    this.propertiesContent.innerHTML += this.createTextArea(property.name, property.value.join(',\n'), property.hint, property.readOnly);
                    break;
                case 'Object':
                    this.propertiesContent.innerHTML += this.createTextArea(property.name, Object.keys(property.value).length !== 0 ? JSON.stringify(property.value, null, 2) : '', property.hint, property.readOnly);
                    break;
                case 'ArrayObject':
                    this.propertiesContent.innerHTML += this.createTextArea(property.name, property.value.map(
                        element => JSON.stringify(element, null, 2)
                    ), property.hint, property.readOnly);
                    break;
                default:
                    break;
            }
        });

    }

    updateProperties() {
        const object = window.focusState.selectedNode || window.focusState.selectedEdge || window.focusState.selectedCanvas;
        
        if (!object) 
            return;
        // else
        //     console.log('Updating properties for', object.getPropertyValue('id'));

        // Update properties from user input
        object.properties.forEach(property => {
            const inputElement = this.propertiesContent.querySelector(`[data-property-name="${property.name}"]`);

            // console.log('Property '+property.name+' is getting saved as '+inputElement.value);
            
            if (inputElement.value === '' && property.required) {
                console.error('Required property '+property.name+' is null');
                // window.alert('Required property '+property.name+' is null');
                
                document.dispatchEvent(new CustomEvent('display-error-message', {
                    detail: { message: 'Required property ' + property.name + ' is null' }
                }));
            }
            else if (!(inputElement.value === '')) {
                // console.log('Property '+property.name+' is getting saved as '+inputElement.value);
                switch (property.datatype) {
                    case 'Text':
                        property.value = String.raw`${inputElement.value}`;
                        break;
                    case 'TextLarge':
                        property.value = String.raw`${inputElement.value}`;
                        break;
                    case 'Enumeration':
                        property.value = inputElement.value;
                        break;
                    case 'Array':
                        property.value = String.raw`${inputElement.value}`.split(',\n');
                        break;
                    case 'Object':
                        try {
                            property.value = JSON.parse(String.raw`${inputElement.value}`);
                            // console.log('Object property '+property.name+' is getting saved as '+property.value.a);
                        } catch (error) {
                            document.dispatchEvent(new CustomEvent('display-error-message', {
                                detail: { message: 'Invalid JSON in property '+property.name }
                            }));
                        }
                        break;
                    case 'ArrayObject':
                        try {
                            const arrayObject = Array(String.raw`${inputElement.value}`)
                            property.value = arrayObject.map(element => {
                                return JSON.parse(element);
                            });
                            //console.log('ArrayObject property '+property.name+' is getting saved as '+property.value.forEach(element => console.log(element)));
                        } catch (error) {
                            document.dispatchEvent(new CustomEvent('display-error-message', {
                                detail: { message: 'Invalid JSON in property '+property.name }
                            }));
                        }
                        break;
                    default:
                        break;
                }
            }
        });

        switch (window.focusState.current) {
            case 'edge':
                const newText = object.getPropertyValue('name')
                object.text.set('text', newText);
                object.text.set('backgroundColor',newText=== '' ?'#4CAF50':'#8EBAFD');
                object.addNewProperty();
                window.workflowDesigner.fabricCanvas.renderAll();
                break;
            case 'node':
                object.text.set('text', object.getPropertyValue('name'));
                window.workflowDesigner.fabricCanvas.renderAll();
                break;
        }

    }

    createTextInput(label, value, hint, readOnly = false) {
        return `
            <div class="property">
                <label>${label}</label>
                <input type="text" class="${label}" data-property-name="${label}" value="${value || ''}" placeholder="${hint || ''}" ${readOnly ? 'readonly' : ''}>
            </div>
        `;
    }

    createTextArea(label, value, hint, readOnly = false) {
        // console.log('Property '+label+' is getting loaded as '+value);
        return `
            <div class="property">
                <label>${label}</label>
                <textarea class="${label}" data-property-name="${label}" placeholder="${hint || ''}" ${readOnly ? 'readonly' : ''}>${value || ''}</textarea>
            </div>
        `;
    }

    createSelectInput(label, options, value, hint, readOnly = false) {
        const optionsHtml = options.map(option => `<option value="${option}" ${option === value ? 'selected' : ''}>${option}</option>`).join('');
        return `
            <div class="property">
                <label>${label}</label>
                <select class="${label}" data-property-name="${label}" ${readOnly ? 'disabled' : ''}>
                    ${optionsHtml}
                </select>
            </div>
        `;
    }

    // createSVGViewBox(label, value, hint, readOnly = false) {
    //     value = value.replace(/^"|"$/g, '');
    //     value = value.replace(/\\n/g, '\n');
    //     value = value.replace(/\\/g, '');
    //     // console.log('Property '+label+' is getting loaded as '+value);

    //     return `
    //         <div class="property">
    //             <label>${label}</label>
    //             <div ${readOnly ? 'readonly' : ''} title="${hint || ''}">
    //                 ${value}
    //             </div>
    //         </div>
    //     `;
        
    // }

    // createBase64PngViewBox(label, value, hint, readOnly = false) {
    //     return `
    //         <div class="property">
    //             <label>${label}</label>
    //             <img src="data:image/png;base64,${value}" alt="${hint || label}" ${readOnly ? 'readonly' : ''}>
    //         </div>
    //     `;
    // }
}

customElements.define('hmh-properties', HMHProperties);