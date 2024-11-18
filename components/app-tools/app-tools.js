import { BaseComponent } from '../base/base.js';

class AppTools extends BaseComponent {
    constructor() {
        super('app-tools', 'open');
    }

    async connectedCallback() {
        const shadowRoot = await super.connectedCallback();
        
        setTimeout(() => {
            const items = shadowRoot.querySelectorAll('.node-item, .connector-item');
            
            items.forEach(item => {
                item.addEventListener('click', () => {
                    const type = item.dataset.type;
                    // Dispatch event to create node
                    this.dispatchEvent(new CustomEvent('create-node', {
                        bubbles: true,
                        composed: true,
                        detail: { type }
                    }));
                });
            });
        }, 0);
    }
}

customElements.define('app-tools', AppTools);