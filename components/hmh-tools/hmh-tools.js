import { BaseComponent } from '../base/base.js';

class HMHTools extends BaseComponent {
    constructor() {
        super('hmh-tools');
    }

    async connectedCallback() {
        const shadowRoot = await super.connectedCallback();
        if (shadowRoot) {
            this.setupEventListeners(shadowRoot);
        }
    }

    setupEventListeners(shadowRoot) {
        // Search Tools
        document.addEventListener('search', (e) => {
            const accordion = shadowRoot.querySelector('hmh-accordion');
            if (accordion) {
                accordion.filterItems(e.detail.searchTerm);
            }
        });
    }
}

customElements.define('hmh-tools', HMHTools);