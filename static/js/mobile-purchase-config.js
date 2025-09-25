/**
 * Mobile Purchase Configuration for App Store Integration
 * Handles iOS and Android in-app purchase setup
 */

const PURCHASE_CONFIG = {
    // Product definitions for both Apple and Google stores
    products: {
        academic_speaking: {
            apple_id: 'com.ieltsaiprep.academic_speaking',
            google_id: 'com.ieltsaiprep.academic_speaking',
            price: 36.00,
            currency: 'USD',
            title: 'Academic Speaking Assessment',
            description: 'AI-powered speaking assessment with Maya examiner using Nova Sonic technology'
        },
        academic_writing: {
            apple_id: 'com.ieltsaiprep.academic_writing',
            google_id: 'com.ieltsaiprep.academic_writing', 
            price: 36.00,
            currency: 'USD',
            title: 'Academic Writing Assessment',
            description: 'Comprehensive writing evaluation with detailed feedback and scoring'
        },
        general_speaking: {
            apple_id: 'com.ieltsaiprep.general_speaking',
            google_id: 'com.ieltsaiprep.general_speaking',
            price: 36.00,
            currency: 'USD',
            title: 'General Training Speaking Assessment',
            description: 'Speaking practice and assessment for General Training IELTS'
        },
        general_writing: {
            apple_id: 'com.ieltsaiprep.general_writing',
            google_id: 'com.ieltsaiprep.general_writing',
            price: 36.00,
            currency: 'USD', 
            title: 'General Training Writing Assessment',
            description: 'Writing assessment and feedback for General Training IELTS'
        }
    },
    
    // API endpoints for purchase verification
    verification_endpoints: {
        apple: '/api/purchase/verify-apple',
        google: '/api/purchase/verify-google'
    },
    
    // Purchase flow configuration
    flow_config: {
        timeout: 30000, // 30 seconds for purchase completion
        retry_attempts: 3,
        show_loading: true,
        auto_unlock: true // Automatically unlock content after successful purchase
    },
    
    // Localization for different markets
    localization: {
        en: {
            purchase_loading: 'Processing your purchase...',
            purchase_success: 'Purchase successful! Assessment unlocked.',
            purchase_failed: 'Purchase failed. Please try again.',
            verification_loading: 'Verifying purchase...',
            network_error: 'Network error. Please check your connection.',
            already_owned: 'You already own this assessment.',
            restore_purchases: 'Restore Purchases'
        }
    }
};

// Initialize purchase manager with configuration
function initializePurchaseSystem() {
    if (window.purchaseManager) {
        window.purchaseManager.configure(PURCHASE_CONFIG);
        console.log('Purchase system initialized with Lambda backend');
    }
}

// Export configuration
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PURCHASE_CONFIG;
}

// Initialize when DOM is ready
if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', initializePurchaseSystem);
}