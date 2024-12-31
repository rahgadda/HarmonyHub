import { BaseComponent } from '../base/base.js';

class HMHImagepopup extends BaseComponent {
    constructor() {
        super('hmh-imagepopup');
    }

    async connectedCallback() {
        const shadowRoot = await super.connectedCallback();
        
        this.popup = shadowRoot.querySelector('.hmh-popup-overlay');
        this.closeBtn = shadowRoot.querySelector('.hmh-close-button');
        this.image = shadowRoot.querySelector('.hmh-popup-image');

        // Bind methods
        this.showPopup = this.showPopup.bind(this);
        this.hidePopup = this.hidePopup.bind(this);
        this.handleClickOutside = this.handleClickOutside.bind(this);
        this.handleKeyPress = this.handleKeyPress.bind(this);

        // Add event listeners
        this.closeBtn.addEventListener('click', this.hidePopup);
        this.popup.addEventListener('click', this.handleClickOutside);
        document.addEventListener('keydown', this.handleKeyPress);

        // Listen for custom event to show image popup
        document.addEventListener('show-image-popup', (event) => {
            // console.log('show-image-popup event received', event.detail);
            const { nodeName, nodeImage } = event.detail;
            this.image.alt = nodeName;
            this.image.src = `data:image/png;base64,${nodeImage}`;
            this.showPopup();
        });

        // Set initial image if attribute exists
        const initialImage = this.getAttribute('image-data');
        if (initialImage) {
            this.image.src = initialImage;
        }
    }

    // Show popup
    showPopup() {
        this.popup.style.display = 'flex';
        // Force reflow
        this.popup.offsetHeight;
        this.popup.classList.add('active');
    }

    // Hide popup
    hidePopup() {
        this.popup.classList.remove('active');
        setTimeout(() => {
            this.popup.style.display = 'none';
        }, 300); // Match transition duration
    }

    // Handle click outside popup content
    handleClickOutside(event) {
        if (event.target === this.popup) {
            this.hidePopup();
        }
    }

    // Handle keyboard events
    handleKeyPress(event) {
        if (event.key === 'Escape' && this.popup.style.display === 'flex') {
            this.hidePopup();
        }
    }

    // Cleanup
    disconnectedCallback() {
        document.removeEventListener('keydown', this.handleKeyPress);
    }
}

customElements.define('hmh-imagepopup', HMHImagepopup);