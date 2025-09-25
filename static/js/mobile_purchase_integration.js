/**
 * Capacitor In-App Purchase Integration for IELTS GenAI Prep
 * Handles Apple App Store and Google Play Store purchases with Lambda backend verification
 */

class MobilePurchaseManager {
    constructor() {
        this.products = {
            'academic_speaking': {
                id: 'com.ieltsaiprep.academic_speaking',
                price: '$36.49',
                title: 'Academic Speaking Assessment',
                description: 'AI-powered speaking assessment with Maya examiner'
            },
            'academic_writing': {
                id: 'com.ieltsaiprep.academic_writing', 
                price: '$36.49',
                title: 'Academic Writing Assessment',
                description: 'Comprehensive writing evaluation with detailed feedback'
            },
            'general_speaking': {
                id: 'com.ieltsaiprep.general_speaking',
                price: '$36.49', 
                title: 'General Training Speaking Assessment',
                description: 'Speaking practice for General Training IELTS'
            },
            'general_writing': {
                id: 'com.ieltsaiprep.general_writing',
                price: '$36.49',
                title: 'General Training Writing Assessment', 
                description: 'Writing assessment for General Training IELTS'
            }
        };
        
        this.purchaseState = {
            loading: false,
            lastPurchase: null,
            ownedProducts: []
        };
        
        this.initializePurchases();
    }
    
    async initializePurchases() {
        try {
            // Check if running on device with in-app purchase capability
            if (!window.Capacitor || !window.Capacitor.isNativePlatform()) {
                console.log('In-app purchases only available on native platforms');
                return;
            }
            
            // Initialize purchase plugin based on platform
            const { Device } = await import('@capacitor/device');
            const info = await Device.getInfo();
            
            if (info.platform === 'ios') {
                await this.initializeAppleStore();
            } else if (info.platform === 'android') {
                await this.initializeGooglePlay();
            }
            
            // Restore previous purchases
            await this.restorePurchases();
            
        } catch (error) {
            console.error('Purchase initialization failed:', error);
        }
    }
    
    async initializeAppleStore() {
        try {
            // Configure Apple App Store products
            const productIds = Object.values(this.products).map(p => p.id);
            
            // Request product information from App Store
            // This would typically use a Capacitor plugin like @capacitor-community/in-app-purchases
            console.log('Initializing Apple App Store with products:', productIds);
            
            // Set up purchase event listeners
            this.setupApplePurchaseListeners();
            
        } catch (error) {
            console.error('Apple Store initialization failed:', error);
        }
    }
    
    async initializeGooglePlay() {
        try {
            // Configure Google Play Store products
            const productIds = Object.values(this.products).map(p => p.id);
            
            console.log('Initializing Google Play Store with products:', productIds);
            
            // Set up purchase event listeners
            this.setupGooglePurchaseListeners();
            
        } catch (error) {
            console.error('Google Play initialization failed:', error);
        }
    }
    
    setupApplePurchaseListeners() {
        // Listen for Apple purchase events
        document.addEventListener('applePurchaseSuccess', (event) => {
            this.handleApplePurchaseSuccess(event.detail);
        });
        
        document.addEventListener('applePurchaseFailed', (event) => {
            this.handlePurchaseFailure(event.detail);
        });
    }
    
    setupGooglePurchaseListeners() {
        // Listen for Google purchase events
        document.addEventListener('googlePurchaseSuccess', (event) => {
            this.handleGooglePurchaseSuccess(event.detail);
        });
        
        document.addEventListener('googlePurchaseFailed', (event) => {
            this.handlePurchaseFailure(event.detail);
        });
    }
    
    async purchaseProduct(productKey) {
        if (this.purchaseState.loading) {
            throw new Error('Purchase already in progress');
        }
        
        const product = this.products[productKey];
        if (!product) {
            throw new Error(`Product not found: ${productKey}`);
        }
        
        this.purchaseState.loading = true;
        
        try {
            const { Device } = await import('@capacitor/device');
            const info = await Device.getInfo();
            
            if (info.platform === 'ios') {
                return await this.purchaseAppleProduct(product);
            } else if (info.platform === 'android') {
                return await this.purchaseGoogleProduct(product);
            } else {
                throw new Error('In-app purchases not supported on this platform');
            }
            
        } catch (error) {
            this.purchaseState.loading = false;
            throw error;
        }
    }
    
    async purchaseAppleProduct(product) {
        try {
            // Show loading state
            await this.showPurchaseLoading(`Purchasing ${product.title}...`);
            
            // Initiate Apple purchase
            // This would use a Capacitor plugin to trigger the App Store purchase flow
            console.log('Initiating Apple purchase for:', product.id);
            
            // Simulate purchase flow - in real implementation, this would trigger native iOS purchase
            return new Promise((resolve, reject) => {
                // The actual purchase would be handled by iOS and trigger the success/failure events
                setTimeout(() => {
                    // Mock successful purchase for testing
                    const mockReceipt = {
                        transactionId: `apple_${Date.now()}`,
                        productId: product.id,
                        receiptData: 'base64_encoded_receipt_data',
                        purchaseDate: new Date().toISOString()
                    };
                    
                    this.handleApplePurchaseSuccess(mockReceipt);
                    resolve(mockReceipt);
                }, 2000);
            });
            
        } catch (error) {
            console.error('Apple purchase failed:', error);
            throw error;
        }
    }
    
    async purchaseGoogleProduct(product) {
        try {
            // Show loading state
            await this.showPurchaseLoading(`Purchasing ${product.title}...`);
            
            // Initiate Google Play purchase
            console.log('Initiating Google Play purchase for:', product.id);
            
            // Simulate purchase flow
            return new Promise((resolve, reject) => {
                setTimeout(() => {
                    // Mock successful purchase for testing
                    const mockPurchase = {
                        orderId: `google_${Date.now()}`,
                        productId: product.id,
                        purchaseToken: 'google_purchase_token_example',
                        purchaseTime: Date.now(),
                        purchaseState: 1 // Purchased
                    };
                    
                    this.handleGooglePurchaseSuccess(mockPurchase);
                    resolve(mockPurchase);
                }, 2000);
            });
            
        } catch (error) {
            console.error('Google Play purchase failed:', error);
            throw error;
        }
    }
    
    async handleApplePurchaseSuccess(purchaseData) {
        try {
            this.purchaseState.loading = false;
            
            // Show verification in progress
            await window.apiClient.showToastNotification(
                'Verifying your purchase with Apple...',
                'short',
                'center'
            );
            
            // Verify purchase with Lambda backend using Apple App Store Connect API
            const verification = await window.apiClient.verifyApplePurchase(
                purchaseData.receiptData,
                purchaseData.productId
            );
            
            if (verification.success) {
                // Update local state
                this.purchaseState.ownedProducts.push(purchaseData.productId);
                this.purchaseState.lastPurchase = purchaseData;
                
                // Get product title for notification
                const productKey = Object.keys(this.products).find(
                    key => this.products[key].id === purchaseData.productId
                );
                const productTitle = this.products[productKey]?.title || 'Assessment';
                
                // Show success notification with Toast
                await window.apiClient.showPurchaseConfirmation(productTitle);
                
                // ONLY after successful payment verification - redirect to registration
                if (verification.data && verification.data.payment_verified === true) {
                    // Store purchase data for registration
                    localStorage.setItem('purchaseProductId', purchaseData.productId);
                    localStorage.setItem('purchaseTransactionId', purchaseData.transactionId);
                    localStorage.setItem('purchasePlatform', 'apple');
                    localStorage.setItem('purchaseVerified', 'true');
                    
                    // Redirect to registration page only after payment confirmation
                    window.location.href = '/mobile-registration?productId=' + purchaseData.productId + '&transactionId=' + purchaseData.transactionId + '&platform=apple';
                } else {
                    throw new Error('Payment verification incomplete');
                }
                
                // Unlock content in app and update DynamoDB
                await this.unlockAssessmentModule(purchaseData.productId, verification.data);
                
                // Log success to CloudWatch via Lambda
                console.log('Apple purchase verified successfully:', {
                    productId: purchaseData.productId,
                    transactionId: purchaseData.transactionId,
                    timestamp: new Date().toISOString()
                });
                
                return verification.data;
            } else {
                throw new Error(verification.error || 'Purchase verification failed');
            }
            
        } catch (error) {
            console.error('Apple purchase verification failed:', error);
            await this.showPurchaseError(error.message);
            
            // Log error to CloudWatch
            console.error('Apple purchase error:', {
                error: error.message,
                productId: purchaseData.productId,
                timestamp: new Date().toISOString()
            });
            
            throw error;
        }
    }
    
    async handleGooglePurchaseSuccess(purchaseData) {
        try {
            this.purchaseState.loading = false;
            
            // Show verification in progress
            await window.apiClient.showToastNotification(
                'Verifying your purchase with Google Play...',
                'short',
                'center'
            );
            
            // Verify purchase with Lambda backend using Google Play Billing API
            const verification = await window.apiClient.verifyGooglePurchase(
                purchaseData.purchaseToken,
                purchaseData.productId
            );
            
            if (verification.success) {
                // Update local state
                this.purchaseState.ownedProducts.push(purchaseData.productId);
                this.purchaseState.lastPurchase = purchaseData;
                
                // Get product title for notification
                const productKey = Object.keys(this.products).find(
                    key => this.products[key].id === purchaseData.productId
                );
                const productTitle = this.products[productKey]?.title || 'Assessment';
                
                // Show success notification with Toast
                await window.apiClient.showPurchaseConfirmation(productTitle);
                
                // ONLY after successful payment verification - redirect to registration
                if (verification.data && verification.data.payment_verified === true) {
                    // Store purchase data for registration
                    localStorage.setItem('purchaseProductId', purchaseData.productId);
                    localStorage.setItem('purchaseOrderId', purchaseData.orderId);
                    localStorage.setItem('purchasePlatform', 'google');
                    localStorage.setItem('purchaseVerified', 'true');
                    
                    // Redirect to registration page only after payment confirmation
                    window.location.href = '/mobile-registration?productId=' + purchaseData.productId + '&orderId=' + purchaseData.orderId + '&platform=google';
                } else {
                    throw new Error('Payment verification incomplete');
                }
                
                // Unlock content in app and update DynamoDB
                await this.unlockAssessmentModule(purchaseData.productId, verification.data);
                
                // Log success to CloudWatch via Lambda
                console.log('Google purchase verified successfully:', {
                    productId: purchaseData.productId,
                    orderId: purchaseData.orderId,
                    purchaseToken: purchaseData.purchaseToken.substring(0, 20) + '...',
                    timestamp: new Date().toISOString()
                });
                
                return verification.data;
            } else {
                throw new Error(verification.error || 'Purchase verification failed');
            }
            
        } catch (error) {
            console.error('Google purchase verification failed:', error);
            await this.showPurchaseError(error.message);
            
            // Log error to CloudWatch
            console.error('Google purchase error:', {
                error: error.message,
                productId: purchaseData.productId,
                timestamp: new Date().toISOString()
            });
            
            throw error;
        }
    }
    
    handlePurchaseFailure(error) {
        this.purchaseState.loading = false;
        console.error('Purchase failed:', error);
        this.showPurchaseError(error.message || 'Purchase failed');
    }
    
    async restorePurchases() {
        try {
            const { Device } = await import('@capacitor/device');
            const info = await Device.getInfo();
            
            console.log('Restoring purchases...');
            
            // Restore purchases from platform
            if (info.platform === 'ios') {
                // iOS restore purchases
                console.log('Restoring Apple purchases');
            } else if (info.platform === 'android') {
                // Android restore purchases
                console.log('Restoring Google Play purchases');
            }
            
            // Update UI with restored purchases
            await this.updatePurchaseUI();
            
        } catch (error) {
            console.error('Purchase restoration failed:', error);
        }
    }
    
    async unlockAssessmentModule(productId, verificationData) {
        // Find the assessment type from product ID
        const assessmentType = Object.keys(this.products).find(
            key => this.products[key].id === productId
        );
        
        if (assessmentType) {
            try {
                // Update user's profile in DynamoDB via Lambda API
                const unlockResponse = await window.apiClient.makeAPICall('/api/user/unlock-module', 'POST', {
                    product_id: productId,
                    assessment_type: assessmentType,
                    verification_data: verificationData
                });
                
                if (unlockResponse.success) {
                    // Show unlock confirmation with Toast
                    await window.apiClient.showToastNotification(
                        `${this.products[assessmentType].title} is now available!`,
                        'long',
                        'center'
                    );
                    
                    // Enable assessment in app
                    console.log(`Assessment module unlocked in DynamoDB: ${assessmentType}`);
                    
                    // Update app state to show purchased content
                    document.dispatchEvent(new CustomEvent('assessmentUnlocked', {
                        detail: { 
                            assessmentType, 
                            productId, 
                            unlocked: true,
                            timestamp: new Date().toISOString()
                        }
                    }));
                    
                    // Log to CloudWatch via Lambda
                    console.log('Module unlocked successfully:', {
                        assessmentType,
                        productId,
                        userId: unlockResponse.user_id,
                        timestamp: new Date().toISOString()
                    });
                    
                } else {
                    throw new Error('Failed to unlock module in database');
                }
                
            } catch (error) {
                console.error('Module unlock failed:', error);
                await window.apiClient.showToastNotification(
                    'Purchase verified but module unlock failed. Contact support.',
                    'long',
                    'center'
                );
            }
        }
    }
    
    async showPurchaseLoading(message) {
        try {
            const { Toast } = await import('@capacitor/toast');
            await Toast.show({
                text: message,
                duration: 'short'
            });
        } catch (error) {
            console.log(message);
        }
    }
    
    async showPurchaseSuccess(data) {
        const message = `Purchase successful! ${data.module} assessment unlocked.`;
        
        try {
            const { Toast } = await import('@capacitor/toast');
            await Toast.show({
                text: message,
                duration: 'long'
            });
        } catch (error) {
            alert(message);
        }
    }
    
    async showPurchaseError(error) {
        const message = `Purchase failed: ${error}`;
        
        try {
            const { Toast } = await import('@capacitor/toast');
            await Toast.show({
                text: message,
                duration: 'long'
            });
        } catch (error) {
            alert(message);
        }
    }
    
    async updatePurchaseUI() {
        // Update UI to reflect current purchase state
        document.dispatchEvent(new CustomEvent('purchaseStateUpdated', {
            detail: this.purchaseState
        }));
    }
    
    // Check if user owns specific product
    hasProduct(productKey) {
        const product = this.products[productKey];
        return product && this.purchaseState.ownedProducts.includes(product.id);
    }
    
    // Get all available products
    getAvailableProducts() {
        return Object.keys(this.products).map(key => ({
            key,
            ...this.products[key],
            owned: this.hasProduct(key)
        }));
    }
}

// Global purchase manager instance
const purchaseManager = new MobilePurchaseManager();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MobilePurchaseManager;
}

// Make available globally for Capacitor app
window.purchaseManager = purchaseManager;