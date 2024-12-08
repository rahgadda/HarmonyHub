import { BaseComponent } from '../base/base.js';

class HMHFooter extends BaseComponent {
    constructor() {
        super('hmh-footer');
        this.logCounts = {
            log: 0,
            warn: 0, 
            error: 0
        };

        // Store original console methods
        this.originalLog = console.log.bind(console);
        this.originalWarn = console.warn.bind(console);
        this.originalError = console.error.bind(console);
    }

    async connectedCallback() {
        const shadowRoot = await super.connectedCallback();
        if (!shadowRoot) return;

        this.container = shadowRoot.getElementById('console-container');
        this.showBtn = shadowRoot.getElementById('show-console-btn');
        this.logger = shadowRoot.getElementById('console-logger');
        this.logCountEl = shadowRoot.getElementById('log-count');
        this.warnCountEl = shadowRoot.getElementById('warn-count');
        this.errorCountEl = shadowRoot.getElementById('error-count');

        this.setupConsoleOverride();
    }

    setupConsoleOverride() {
        // Use arrow functions to preserve this context
        console.log = (...args) => {
            this.createLogEntry(args[0], 'log');
            this.originalLog(...args);
        };

        console.warn = (...args) => {
            this.createLogEntry(args[0], 'warn');
            this.originalWarn(...args);
        };

        console.error = (...args) => {
            this.createLogEntry(args[0], 'error');
            this.originalError(...args);
        };
    }

    createLogEntry(message, type) {
        const entry = document.createElement('div');
        entry.classList.add('log-entry', type);
        
        const now = new Date();
        const timestamp = now.toLocaleTimeString();
        
        // Format the message based on type and content
        let formattedMessage = this.formatMessage(message);
        
        entry.innerHTML = `
            <div class="log-content">
                <div class="log-header">
                    <span class="timestamp">${timestamp}</span>&nbsp;
                    <span class="log-type">${type.toUpperCase()}</span>
                </div>
                ${formattedMessage}
            </div>
        `;
        
        this.logger.appendChild(entry);
        this.logCounts[type]++;
        this.updateCountBadges();
        
        if (this.logger.children.length > 100) {
            this.logger.removeChild(this.logger.firstChild);
            this.logCounts[type]--;
        }

        if (this.container.style.display === 'flex') {
            this.logger.scrollTop = this.logger.scrollHeight;
        }

        // auto-show behavior
        // if (this.container.style.display !== 'flex') {
        //     this.showConsole();
        // }
    }

    updateCountBadges() {
        this.logCountEl.textContent = `Logs: ${this.logCounts.log}`;
        this.warnCountEl.textContent = `Warns: ${this.logCounts.warn}`;
        this.errorCountEl.textContent = `Errors: ${this.logCounts.error}`;
    }

    showConsole() {
        this.container.style.display = 'flex';
        this.showBtn.style.display = 'none';
    }

    closeConsole() {
        this.container.style.display = 'none';
        this.showBtn.style.display = 'block';
    }

    clearLogs() {
        this.logger.innerHTML = '';
        this.logCounts = {log: 0, warn: 0, error: 0};
        this.updateCountBadges();
    }

    formatMessage(message, type) {
        try {
            // Handle Error objects
            if (message instanceof Error) {
                return `
                    <div class="error-details">
                        <div class="error-message">${this.escapeHtml(message.message)}</div>
                        ${message.stack ? `<pre class="error-stack">${this.escapeHtml(message.stack)}</pre>` : ''}
                    </div>
                `;
            }
            
            //Handle arrays
            if (Array.isArray(message)) {
                return `
                    <div class="message">
                        <pre class="object-preview">${this.escapeHtml(JSON.stringify(message, null, 2))}</pre>
                    </div>
                `;
            }

            // Handle objects (including arrays)
            if (typeof message === 'object' && message !== null) {
                try {
                    // Use a replacer function to handle circular references
                    const seen = new WeakSet();
                    const formatted = JSON.stringify(message, (key, value) => {
                        if (typeof value === 'object' && value !== null) {
                            if (seen.has(value)) {
                                return '[Circular Reference]';
                            }
                            seen.add(value);
                        }
                        return value;
                    }, 2);

                    return `
                        <div class="message">
                            <pre class="object-preview">${this.escapeHtml(formatted)}</pre>
                        </div>
                    `;
                } catch (err) {
                    return `<div class="message">${this.escapeHtml(String(message))}</div>`;
                }
            }
            
            // Handle primitive values
            return `<div class="message">${this.escapeHtml(String(message))}</div>`;
        } catch (err) {
            return `<div class="message">Error formatting message: ${this.escapeHtml(err.message)}</div>`;
        }
    }

    escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }
}

customElements.define('hmh-footer', HMHFooter);