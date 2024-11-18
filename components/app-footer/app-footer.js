import { BaseComponent } from '../base/base.js';

class AppFooter extends BaseComponent {
    constructor() {
        super('app-footer');
    }
}

customElements.define('app-footer', AppFooter);