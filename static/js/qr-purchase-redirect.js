/**
 * QR Code Purchase Redirect System
 * Generates QR codes for mobile app downloads and purchase flow
 */

class PurchaseRedirectManager {
    constructor() {
        this.appStoreUrls = {
            ios: 'https://apps.apple.com/app/ielts-genai-prep/id[APP_STORE_ID]',
            android: 'https://play.google.com/store/apps/details?id=com.ieltsaiprep.app'
        };
        
        this.initializeQRCodes();
    }
    
    initializeQRCodes() {
        // Generate QR codes for app store links
        this.generateQRCode('ios-qr-container', this.appStoreUrls.ios);
        this.generateQRCode('android-qr-container', this.appStoreUrls.android);
    }
    
    generateQRCode(containerId, url) {
        const container = document.getElementById(containerId);
        if (!container) return;
        
        // Create QR code using a simple SVG approach
        const qrCodeSvg = this.createQRCodeSVG(url);
        container.innerHTML = qrCodeSvg;
    }
    
    createQRCodeSVG(url) {
        // Simple QR code placeholder - in production, use QR.js library
        return `
            <div class="qr-code-placeholder" data-url="${url}">
                <div class="qr-pattern">
                    <div class="qr-square"></div>
                    <div class="qr-square"></div>
                    <div class="qr-square"></div>
                    <div class="qr-square"></div>
                </div>
                <p class="qr-instruction">Scan to download mobile app</p>
            </div>
        `;
    }
    
    detectMobileDevice() {
        const userAgent = navigator.userAgent.toLowerCase();
        
        if (/iphone|ipad|ipod/.test(userAgent)) {
            return 'ios';
        } else if (/android/.test(userAgent)) {
            return 'android';
        }
        return 'desktop';
    }
    
    showPurchaseFlow(assessmentType) {
        const device = this.detectMobileDevice();
        
        if (device === 'desktop') {
            // Show QR codes for mobile app download
            this.showQRCodeModal(assessmentType);
        } else {
            // Direct to appropriate app store
            this.redirectToAppStore(device);
        }
    }
    
    showQRCodeModal(assessmentType) {
        const modal = document.createElement('div');
        modal.className = 'purchase-modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Complete Purchase on Mobile App</h3>
                    <button class="close-modal">&times;</button>
                </div>
                <div class="modal-body">
                    <p class="mb-3">To purchase ${assessmentType} assessments with automatic tax compliance, download our mobile app:</p>
                    
                    <div class="app-download-section">
                        <div class="app-store-option">
                            <h4>iPhone/iPad</h4>
                            <div id="ios-qr-container"></div>
                            <a href="${this.appStoreUrls.ios}" target="_blank" class="btn btn-primary">
                                Download from App Store
                            </a>
                        </div>
                        
                        <div class="app-store-option">
                            <h4>Android</h4>
                            <div id="android-qr-container"></div>
                            <a href="${this.appStoreUrls.android}" target="_blank" class="btn btn-success">
                                Download from Google Play
                            </a>
                        </div>
                    </div>
                    
                    <div class="purchase-instructions">
                        <h5>After downloading:</h5>
                        <ol>
                            <li>Complete your purchase in the mobile app</li>
                            <li>Return to this website and login</li>
                            <li>Access your purchased assessments instantly</li>
                        </ol>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        this.initializeQRCodes();
        
        // Close modal functionality
        modal.querySelector('.close-modal').onclick = () => {
            document.body.removeChild(modal);
        };
        
        modal.onclick = (e) => {
            if (e.target === modal) {
                document.body.removeChild(modal);
            }
        };
    }
    
    redirectToAppStore(device) {
        const url = this.appStoreUrls[device];
        window.open(url, '_blank');
    }
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', () => {
    window.purchaseRedirectManager = new PurchaseRedirectManager();
});

// Global function to trigger purchase flow
function initiatePurchaseFlow(assessmentType) {
    window.purchaseRedirectManager.showPurchaseFlow(assessmentType);
}