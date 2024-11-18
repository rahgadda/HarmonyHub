import { BaseComponent } from '../base/base.js';

class AppHamburger extends BaseComponent {
    constructor() {
        super('app-hamburger');
    }

    connectedCallback() {
        super.connectedCallback();
        this.addEventListener('click', this.toggleMenu);
    }

    toggleMenu() {
        this.classList.toggle('active');
        
        // Dispatch custom event for parent components
        this.dispatchEvent(new CustomEvent('app-hamburger-toggle', {
            bubbles: true,
            composed: true
        }));
    }
}

customElements.define('app-hamburger', AppHamburger);