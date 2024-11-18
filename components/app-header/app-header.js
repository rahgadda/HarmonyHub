import { BaseComponent } from '../base/base.js';

class AppHeader extends BaseComponent {
    constructor() {
        super('app-header');
    }
}

customElements.define('app-header', AppHeader);
