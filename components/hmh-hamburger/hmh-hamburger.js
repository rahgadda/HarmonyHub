import { BaseComponent } from '../base/base.js';

class HMHHamburger extends BaseComponent {
    constructor() {
        super('hmh-hamburger');
    }

    connectedCallback() {
        super.connectedCallback();
        this.addEventListener('click', this.toggleMenu);
    }

    toggleMenu() {
        this.classList.toggle('active');
        
        // Dispatch custom event for parent components
        this.dispatchEvent(new CustomEvent('hmh-hamburger-toggle', {
            bubbles: true,
            composed: true
        }));
    }
}

customElements.define('hmh-hamburger', HMHHamburger);