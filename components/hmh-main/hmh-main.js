import { BaseComponent } from '../base/base.js';


class HMHMain extends BaseComponent {
    constructor() {
        super('hmh-main');
    }

    async connectedCallback() {
        const shadowRoot = await super.connectedCallback();
        const HMHTools = shadowRoot.querySelector('hmh-tools');
        const HMHProperties = shadowRoot.querySelector('hmh-properties');
        const saveMessage = shadowRoot.getElementById('saveMessage');
        const errorMessage = shadowRoot.getElementById('errorMessage');

        //Add Event Listener
        // 1. Hamburger menu toggle event
        this.addEventListener('hmh-hamburger-toggle', (event) => {
            HMHTools.classList.toggle('hidden');
            HMHProperties.classList.toggle('hidden');
        });

        // 3. Populate Error
        document.addEventListener('display-error-message', (event) => {
            errorMessage.innerHTML = event.detail.message;
            errorMessage.style.display = 'block';
            
            setTimeout(() => {
                errorMessage.style.display = 'none';
            }, 2000);
        });

        // 3. Update properties
        HMHProperties.addEventListener('mouseout', () => {
            // console.log("Focus out");

            // Update global focus state
            window.focusState = {
                current: window.focusState.current,
                previous: window.focusState.previous,
                selectedNode: window.focusState.selectedNode,
                selectedEdge: window.focusState.selectedEdge,
                selectedCanvas: window.focusState.selectedCanvas,
                onPropertyPallet: false
            };

            document.dispatchEvent(new CustomEvent('save-attributes'));

            saveMessage.style.display = 'block';
            setTimeout(() => {
                saveMessage.style.display = 'none';
            }, 2000);
        });

        HMHProperties.addEventListener('mouseover', () => {
            // console.log("Focus in");
            
            window.focusState = {
                current: window.focusState.current,
                previous: window.focusState.previous,
                selectedNode: window.focusState.selectedNode,
                selectedEdge: window.focusState.selectedEdge,
                selectedCanvas: window.focusState.selectedCanvas,
                onPropertyPallet: true
            };
        });
    }
}

// https://www.svgrepo.com/
// https://www.reshot.com/free-svg-icons/
// https://icon-sets.iconify.design/logos/grpc/
customElements.define('hmh-main', HMHMain);