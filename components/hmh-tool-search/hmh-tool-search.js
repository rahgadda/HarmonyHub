// components/hmh-tool-search/hmh-tool-search.js
import { BaseComponent } from '../base/base.js';

class HMHToolSearch extends BaseComponent {
    constructor() {
        super('hmh-tool-search');
    }

    async connectedCallback() {
        const shadowRoot = await super.connectedCallback();
        // Wait for shadowRoot to be available before setting up event listeners
        if (shadowRoot) {
            this.setupEventListeners(shadowRoot);
        }
    }

    setupEventListeners(shadowRoot) {
        const searchBox = shadowRoot.querySelector('.search-box');
        if (searchBox) {
            searchBox.addEventListener('input', (e) => {
                const searchTerm = e.target.value;
                this.dispatchEvent(new CustomEvent('search', {
                    bubbles: true,
                    composed: true,
                    detail: { searchTerm }
                }));
            });
        }
    }
}

customElements.define('hmh-tool-search', HMHToolSearch);