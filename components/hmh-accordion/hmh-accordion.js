import { BaseComponent } from '../base/base.js';
import { loadTools } from '../../scripts/load-tools.js';

class HMHAccordion extends BaseComponent {
    constructor() {
        super('hmh-accordion');
        this._shadowRoot = null;
        this.tools = null;
    }

    async connectedCallback() {
        this._shadowRoot = await super.connectedCallback();
        this.tools = await loadTools();
        await this.renderAccordion();
        this.setupEventListeners();
    }

    async renderAccordion() {
        if (!this._shadowRoot || !this.tools) return;
        
        const container = this._shadowRoot.querySelector('.accordion');
        if (!container) return;

        container.innerHTML = Object.entries(this.tools).map(([category, tools]) => `
            <div class="accordion-header">
                <span class="header-title">${category}</span>
                <span class="item-count">${tools.length}</span>
                <svg class="arrow" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M6 9l6 6 6-6"/>
                </svg>
            </div>
            <div class="accordion-content">
                <div class="grid-container">
                    ${tools.map(tool => `
                        <div class="grid-item" data-tool-id="${tool.id}" data-category="${category}">
                            ${tool.svg}
                            <p>${tool.description}</p>
                        </div>
                    `).join('')}
                </div>
            </div>
        `).join('');
    }

    setupEventListeners() {
        if (!this._shadowRoot) return;

        // Add click handlers for accordion headers
        this._shadowRoot.querySelectorAll('.accordion-header').forEach(header => {
            header.addEventListener('click', () => this.toggleAccordion(header));
        });

        // Add click handlers for tool items
        this._shadowRoot.querySelectorAll('.grid-item').forEach(item => {
            item.addEventListener('click', (e) => {
                const toolId = e.currentTarget.dataset.toolId;
                const category = e.currentTarget.dataset.category;
                // console.log(toolId, category);
                if (toolId && category) {
                    const tool = this.tools[category].find(t => t.id === parseInt(toolId));
                    // console.log(tool);
                    if (tool) {
                        window.dispatchEvent(new CustomEvent('tool-selected', {
                            bubbles: true,
                            composed: true,
                            detail: { tool }
                        }));
                    }
                }
            });
        });
    }

    toggleAccordion(header) {
        if (!this._shadowRoot) return;
        const content = header.nextElementSibling;
        const isActive = header.classList.contains('active');
        
        // Close all accordion items
        this._shadowRoot.querySelectorAll('.accordion-header').forEach(h => {
            h.classList.remove('active');
            h.nextElementSibling.classList.remove('active');
        });
        
        // Toggle current item
        if (!isActive) {
            header.classList.add('active');
            content.classList.add('active');
        }
    }

    filterItems(searchTerm) {
        if (!this._shadowRoot) return;

        this._shadowRoot.querySelectorAll('.accordion-content').forEach(content => {
            let visibleCount = 0;
            content.querySelectorAll('.grid-item').forEach(item => {
                const text = item.querySelector('p').textContent.toLowerCase();
                const shouldShow = text.includes(searchTerm.toLowerCase());
                item.style.display = shouldShow ? '' : 'none';
                if (shouldShow) visibleCount++;
            });

            const header = content.previousElementSibling;
            const countBadge = header.querySelector('.item-count');
            countBadge.textContent = visibleCount;
            header.style.display = visibleCount > 0 ? '' : 'none';
        });
    }
}

customElements.define('hmh-accordion', HMHAccordion);