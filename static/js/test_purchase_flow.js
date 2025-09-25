/**
 * Purchase Flow Test Suite for IELTS GenAI Prep
 * Tests in-app purchases with Lambda backend verification and Toast notifications
 */

class PurchaseFlowTester {
    constructor() {
        this.testResults = [];
        this.mockData = {
            appleReceipt: 'ewoJInNpZ25hdHVyZSIgPSAiQXBwbGUgU2lnbmF0dXJlIjsKCSJwdXJjaGFzZS1pbmZvIiA9ICJldzBLSW5CMVltbGpZWFJsWkE9PSI7Cn0=',
            googlePurchaseToken: 'google_play_purchase_token_example_12345',
            sessionId: 'test_session_' + Date.now(),
            products: [
                'com.ieltsaiprep.academic_speaking',
                'com.ieltsaiprep.academic_writing',
                'com.ieltsaiprep.general_speaking',
                'com.ieltsaiprep.general_writing'
            ]
        };
        
        this.initializeTestEnvironment();
    }
    
    async initializeTestEnvironment() {
        console.log('Initializing purchase flow test environment...');
        
        // Mock user session for testing
        if (window.apiClient) {
            window.apiClient.sessionId = this.mockData.sessionId;
            console.log('Test session set:', this.mockData.sessionId);
        }
        
        // Set up test event listeners
        this.setupTestEventListeners();
    }
    
    setupTestEventListeners() {
        // Listen for assessment unlock events
        document.addEventListener('assessmentUnlocked', (event) => {
            console.log('Assessment unlocked event received:', event.detail);
            this.testResults.push({
                test: 'assessment_unlock_event',
                success: true,
                data: event.detail,
                timestamp: new Date().toISOString()
            });
        });
        
        // Listen for purchase state updates
        document.addEventListener('purchaseStateUpdated', (event) => {
            console.log('Purchase state updated:', event.detail);
            this.testResults.push({
                test: 'purchase_state_update',
                success: true,
                data: event.detail,
                timestamp: new Date().toISOString()
            });
        });
    }
    
    async testToastNotifications() {
        console.log('Testing Toast notifications...');
        
        try {
            // Test latency notification
            await window.apiClient.showLatencyNotification();
            await this.delay(2000);
            
            // Test purchase confirmation
            await window.apiClient.showPurchaseConfirmation('Academic Speaking Assessment');
            await this.delay(2000);
            
            // Test network error notification
            await window.apiClient.showNetworkError();
            await this.delay(2000);
            
            // Test generic toast notification
            await window.apiClient.showToastNotification(
                'Testing toast notification system',
                'long',
                'center'
            );
            
            this.testResults.push({
                test: 'toast_notifications',
                success: true,
                message: 'All toast notifications displayed successfully',
                timestamp: new Date().toISOString()
            });
            
            console.log('✓ Toast notifications test completed');
            
        } catch (error) {
            this.testResults.push({
                test: 'toast_notifications',
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            });
            
            console.error('✗ Toast notifications test failed:', error);
        }
    }
    
    async testApplePurchaseFlow() {
        console.log('Testing Apple purchase verification flow...');
        
        try {
            // Test Apple purchase verification
            const verificationResult = await window.apiClient.verifyApplePurchase(
                this.mockData.appleReceipt,
                this.mockData.products[0] // academic_speaking
            );
            
            this.testResults.push({
                test: 'apple_purchase_verification',
                success: verificationResult.success,
                data: verificationResult,
                timestamp: new Date().toISOString()
            });
            
            if (verificationResult.success) {
                console.log('✓ Apple purchase verification successful');
                
                // Test module unlock process
                await this.testModuleUnlock(this.mockData.products[0], 'academic_speaking');
                
            } else {
                console.log('Apple purchase verification expected to fail in test environment');
            }
            
        } catch (error) {
            this.testResults.push({
                test: 'apple_purchase_verification',
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            });
            
            console.log('Apple purchase test completed (expected in test environment)');
        }
    }
    
    async testGooglePurchaseFlow() {
        console.log('Testing Google Play purchase verification flow...');
        
        try {
            // Test Google purchase verification
            const verificationResult = await window.apiClient.verifyGooglePurchase(
                this.mockData.googlePurchaseToken,
                this.mockData.products[1] // academic_writing
            );
            
            this.testResults.push({
                test: 'google_purchase_verification',
                success: verificationResult.success,
                data: verificationResult,
                timestamp: new Date().toISOString()
            });
            
            if (verificationResult.success) {
                console.log('✓ Google purchase verification successful');
                
                // Test module unlock process
                await this.testModuleUnlock(this.mockData.products[1], 'academic_writing');
                
            } else {
                console.log('Google purchase verification expected to fail in test environment');
            }
            
        } catch (error) {
            this.testResults.push({
                test: 'google_purchase_verification',
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            });
            
            console.log('Google purchase test completed (expected in test environment)');
        }
    }
    
    async testModuleUnlock(productId, assessmentType) {
        console.log(`Testing module unlock for ${assessmentType}...`);
        
        try {
            // Simulate module unlock via Lambda API
            const unlockResult = await window.apiClient.makeAPICall('/api/user/unlock-module', 'POST', {
                product_id: productId,
                assessment_type: assessmentType,
                verification_data: {
                    test: true,
                    timestamp: new Date().toISOString()
                }
            });
            
            this.testResults.push({
                test: 'module_unlock',
                assessment_type: assessmentType,
                success: unlockResult.success,
                data: unlockResult,
                timestamp: new Date().toISOString()
            });
            
            if (unlockResult.success) {
                console.log(`✓ Module unlock successful for ${assessmentType}`);
                
                // Show unlock notification
                await window.apiClient.showToastNotification(
                    `${assessmentType} module unlocked successfully!`,
                    'long',
                    'center'
                );
                
            } else {
                console.log(`Module unlock test completed for ${assessmentType}`);
            }
            
        } catch (error) {
            this.testResults.push({
                test: 'module_unlock',
                assessment_type: assessmentType,
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            });
            
            console.error(`✗ Module unlock failed for ${assessmentType}:`, error);
        }
    }
    
    async testNovaSonicWithLatencyWarning() {
        console.log('Testing Nova Sonic with latency warning...');
        
        try {
            // Show latency notification before Nova Sonic call
            await window.apiClient.showLatencyNotification();
            
            // Simulate Nova Sonic request (will fail in test environment but shows flow)
            const novaResult = await window.apiClient.submitSpeechAssessment(
                'base64_encoded_test_audio',
                'academic_speaking'
            );
            
            this.testResults.push({
                test: 'nova_sonic_with_latency_warning',
                success: novaResult.success,
                data: novaResult,
                timestamp: new Date().toISOString()
            });
            
            if (novaResult.success) {
                console.log('✓ Nova Sonic request completed with latency warning');
            } else {
                console.log('Nova Sonic test completed (expected in test environment)');
            }
            
        } catch (error) {
            this.testResults.push({
                test: 'nova_sonic_with_latency_warning',
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            });
            
            console.log('Nova Sonic latency warning test completed');
        }
    }
    
    async testHealthCheck() {
        console.log('Testing Lambda backend health check...');
        
        try {
            const healthResult = await window.apiClient.checkHealth();
            
            this.testResults.push({
                test: 'lambda_health_check',
                success: healthResult.success,
                data: healthResult,
                timestamp: new Date().toISOString()
            });
            
            if (healthResult.success) {
                console.log('✓ Lambda backend health check successful');
                console.log('Region:', healthResult.region);
                console.log('Endpoint:', healthResult.endpoint);
            } else {
                console.log('Health check test completed');
            }
            
        } catch (error) {
            this.testResults.push({
                test: 'lambda_health_check',
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            });
            
            console.error('✗ Health check failed:', error);
        }
    }
    
    async runAllTests() {
        console.log('Starting comprehensive purchase flow tests...');
        console.log('======================================');
        
        try {
            // Test 1: Toast notifications
            await this.testToastNotifications();
            await this.delay(1000);
            
            // Test 2: Health check
            await this.testHealthCheck();
            await this.delay(1000);
            
            // Test 3: Nova Sonic with latency warning
            await this.testNovaSonicWithLatencyWarning();
            await this.delay(1000);
            
            // Test 4: Apple purchase flow
            await this.testApplePurchaseFlow();
            await this.delay(1000);
            
            // Test 5: Google purchase flow
            await this.testGooglePurchaseFlow();
            await this.delay(1000);
            
            // Generate test report
            this.generateTestReport();
            
        } catch (error) {
            console.error('Test suite error:', error);
        }
    }
    
    generateTestReport() {
        console.log('\n======================================');
        console.log('PURCHASE FLOW TEST REPORT');
        console.log('======================================');
        
        const totalTests = this.testResults.length;
        const successfulTests = this.testResults.filter(t => t.success).length;
        const failedTests = totalTests - successfulTests;
        
        console.log(`Total Tests: ${totalTests}`);
        console.log(`Successful: ${successfulTests}`);
        console.log(`Failed: ${failedTests}`);
        console.log(`Success Rate: ${((successfulTests / totalTests) * 100).toFixed(1)}%`);
        
        console.log('\nTest Details:');
        this.testResults.forEach((result, index) => {
            const status = result.success ? '✓' : '✗';
            console.log(`${index + 1}. ${status} ${result.test}`);
            if (result.error) {
                console.log(`   Error: ${result.error}`);
            }
        });
        
        console.log('\nCloudWatch Logging:');
        console.log('All test results logged to browser console for CloudWatch capture');
        
        // Show final toast notification
        window.apiClient.showToastNotification(
            `Purchase flow tests completed: ${successfulTests}/${totalTests} passed`,
            'long',
            'center'
        );
        
        return {
            totalTests,
            successfulTests,
            failedTests,
            successRate: (successfulTests / totalTests) * 100,
            results: this.testResults
        };
    }
    
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Initialize and run tests when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Wait a moment for other components to initialize
    setTimeout(() => {
        const tester = new PurchaseFlowTester();
        
        // Add global test runner
        window.runPurchaseTests = () => tester.runAllTests();
        window.purchaseFlowTester = tester;
        
        console.log('Purchase flow tester ready. Run tests with: runPurchaseTests()');
        
        // Automatically run tests if in test mode
        if (window.location.search.includes('test=purchase')) {
            tester.runAllTests();
        }
        
    }, 2000);
});