import { BaseComponent } from '../base/base.js';

class AppAccordion extends BaseComponent {
    constructor() {
        super('app-accordion', 'open');
    }

    async connectedCallback() {
        const shadowRoot = await super.connectedCallback();
        
        setTimeout(() => {
            const accordion = shadowRoot.querySelector('.accordion');
            const header = shadowRoot.querySelector('.accordion-header');
            const content = shadowRoot.querySelector('.accordion-content');
            const contentWrapper = content.querySelector('.content-wrapper');

            if (header && accordion && content && contentWrapper) {
                header.addEventListener('click', () => {
                    const isActive = accordion.classList.contains('active');
                    
                    if (!isActive) {
                        // Expand accordion
                        const scrollHeight = contentWrapper.scrollHeight;
                        content.style.height = scrollHeight + 'px';
                        accordion.classList.add('active');
                    } else {
                        // Collapse accordion
                        content.style.height = '0px';
                        accordion.classList.remove('active');
                    }
                });

                // Reset height after transition ends
                content.addEventListener('transitionend', () => {
                    if (accordion.classList.contains('active')) {
                        content.style.height = 'auto';
                    }
                });
            }
        }, 0);
    }
}

customElements.define('app-accordion', AppAccordion);