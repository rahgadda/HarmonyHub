// components/app-yaml/app-yaml.js
import { BaseComponent } from '../base/base.js';

class AppYaml extends BaseComponent {
    constructor() {
        super('app-yaml', 'open');
        this.editor = null;
        this.yamlContent = '';
    }

    async connectedCallback() {
        const shadowRoot = await super.connectedCallback();
        
        setTimeout(async () => {           
            const yamlContainer = shadowRoot.querySelector('.yaml-view');
            const editorContainer = shadowRoot.querySelector('.yaml-code');
            
            if (!yamlContainer || !editorContainer) {
                console.error('Required containers not found:', {
                    yamlContainer: !!yamlContainer,
                    editorContainer: !!editorContainer
                });
                return;
            }

            try {
                // Initialize editor with the current yamlString
                this.yamlContent = window.yamlString;
                
                this.editor = CodeMirror(editorContainer, {
                    value: this.yamlContent,
                    mode: 'yaml',
                    theme: 'default',
                    lineNumbers: false,
                    lineWrapping: false,
                    readOnly: true,
                    viewportMargin: Infinity
                });

                this.editor.setSize('100%', '100%');
                
                // Listen for visibility changes
                window.addEventListener('yaml-updated', (e) => {
                    const { yamlString } = e.detail;
                    if (this.editor) {
                        this.editor.setValue(yamlString);
                    }
                });

            } catch (error) {
                console.error('Failed to initialize editor:', error);
                editorContainer.textContent = 'Failed to initialize YAML editor';
            }
        }, 0);
    }
}

customElements.define('app-yaml', AppYaml);