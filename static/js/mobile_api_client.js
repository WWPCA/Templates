/**
 * Mobile API Client for IELTS GenAI Prep
 * Handles regional routing and Nova Sonic global access via AWS Lambda
 */

class MobileAPIClient {
    constructor() {
        this.regionalEndpoints = {
            'us-east-1': 'https://api-us-east-1.ieltsaiprep.com',
            'eu-west-1': 'https://api-eu-west-1.ieltsaiprep.com',
            'ap-southeast-1': 'https://api-ap-southeast-1.ieltsaiprep.com'
        };
        this.novaSonicEndpoint = 'https://api-us-east-1.ieltsaiprep.com';
        this.websocketEndpoints = {
            'us-east-1': 'wss://ws-us-east-1.ieltsaiprep.com',
            'eu-west-1': 'wss://ws-eu-west-1.ieltsaiprep.com',
            'ap-southeast-1': 'wss://ws-ap-southeast-1.ieltsaiprep.com'
        };
        this.novaSonicWebSocket = 'wss://ws-us-east-1.ieltsaiprep.com'; // Fixed to us-east-1 for Nova Sonic
        this.userRegion = null;
        this.sessionId = null;
        this.activeWebSocket = null;
        
        this.initializeClient();
    }
    
    async initializeClient() {
        // Detect user region based on network/device location
        this.userRegion = await this.detectUserRegion();
        console.log(`Initialized API client for region: ${this.userRegion}`);
    }
    
    async detectUserRegion() {
        try {
            // Use Capacitor Device plugin for location detection
            const { Device } = await import('@capacitor/device');
            const info = await Device.getInfo();
            
            // Use Capacitor Network plugin for connection info
            const { Network } = await import('@capacitor/network');
            const status = await Network.getStatus();
            
            // Simple region detection based on locale/timezone
            const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
            
            if (timezone.includes('America') || timezone.includes('New_York') || timezone.includes('Los_Angeles')) {
                return 'us-east-1';
            } else if (timezone.includes('Europe') || timezone.includes('London') || timezone.includes('Paris')) {
                return 'eu-west-1';
            } else if (timezone.includes('Asia') || timezone.includes('Tokyo') || timezone.includes('Singapore')) {
                return 'ap-southeast-1';
            }
            
            return 'us-east-1'; // Default fallback
        } catch (error) {
            console.warn('Region detection failed, using us-east-1:', error);
            return 'us-east-1';
        }
    }
    
    getRegionalEndpoint() {
        return this.regionalEndpoints[this.userRegion] || this.regionalEndpoints['us-east-1'];
    }
    
    async makeAPICall(endpoint, method = 'POST', data = null, options = {}) {
        const { useRegional = true, timeout = 10000 } = options;
        
        // Nova Sonic always routes to us-east-1
        const baseUrl = endpoint.includes('/nova-sonic/') ? 
            this.novaSonicEndpoint : 
            (useRegional ? this.getRegionalEndpoint() : this.novaSonicEndpoint);
        
        const fullUrl = `${baseUrl}${endpoint}`;
        
        // Extended timeout for Nova Sonic
        const requestTimeout = endpoint.includes('/nova-sonic/') ? 20000 : timeout;
        
        const requestOptions = {
            method,
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'IELTS-GenAI-Prep-Mobile/1.0'
            },
            body: data ? JSON.stringify(data) : null
        };
        
        // Add session ID if available
        if (this.sessionId && data) {
            data.session_id = this.sessionId;
            requestOptions.body = JSON.stringify(data);
        }
        
        return this.executeWithRetry(fullUrl, requestOptions, requestTimeout);
    }
    
    async executeWithRetry(url, options, timeout, maxRetries = 3) {
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), timeout);
                
                const response = await fetch(url, {
                    ...options,
                    signal: controller.signal
                });
                
                clearTimeout(timeoutId);
                
                if (response.ok) {
                    return await response.json();
                } else if (response.status < 500) {
                    // Don't retry client errors
                    throw new Error(`API error: ${response.status} ${response.statusText}`);
                } else if (attempt === maxRetries) {
                    throw new Error(`Server error after ${maxRetries} attempts: ${response.status}`);
                }
                
            } catch (error) {
                if (attempt === maxRetries) {
                    throw error;
                }
                
                // Exponential backoff: 1s, 2s, 4s
                const delay = Math.pow(2, attempt - 1) * 1000;
                console.warn(`API call attempt ${attempt} failed, retrying in ${delay}ms:`, error.message);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }
    
    // Authentication methods
    async registerUser(email, password) {
        try {
            const response = await this.makeAPICall('/api/auth/register', 'POST', {
                email,
                password
            });
            
            return {
                success: true,
                data: response
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    async loginUser(email, password) {
        try {
            const response = await this.makeAPICall('/api/auth/login', 'POST', {
                email,
                password
            });
            
            if (response.session_id) {
                this.sessionId = response.session_id;
                // Store session in device storage
                await this.storeSession(response.session_id);
            }
            
            return {
                success: true,
                data: response
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    // Nova Sonic bi-directional speech assessment (WebSocket to us-east-1)
    async submitSpeechAssessment(audioData, assessmentType = 'academic_speaking') {
        try {
            // Show user notification about potential latency
            await this.showLatencyNotification();
            
            // Use bi-directional WebSocket for real-time Nova Sonic streaming
            const response = await this.startNovaSonicStream(audioData, assessmentType);
            
            return {
                success: true,
                data: response,
                note: 'Bi-directional speech conversation with Maya - voice data not stored'
            };
        } catch (error) {
            return {
                success: false,
                error: error.message,
                retry_suggested: true
            };
        }
    }
    
    async startNovaSonicStream(audioData, assessmentType) {
        return new Promise((resolve, reject) => {
            try {
                // Always connect to us-east-1 for Nova Sonic
                const ws = new WebSocket(this.novaSonicWebSocket);
                this.activeWebSocket = ws;
                
                let conversationData = {
                    maya_audio_response: null,
                    transcript: '',
                    assessment_feedback: '',
                    conversation_id: null
                };
                
                ws.onopen = () => {
                    console.log('Nova Sonic WebSocket connected to us-east-1');
                    
                    // Send audio data for bi-directional processing
                    ws.send(JSON.stringify({
                        action: 'nova-sonic-stream',
                        audio_data: audioData,
                        assessment_type: assessmentType,
                        session_id: this.sessionId
                    }));
                };
                
                ws.onmessage = (event) => {
                    try {
                        const data = JSON.parse(event.data);
                        
                        if (data.type === 'maya_response') {
                            // Real-time Maya audio response
                            conversationData.maya_audio_response = data.audio_data;
                            conversationData.transcript += data.transcript || '';
                            
                            // Play Maya's response audio if available
                            if (data.audio_data) {
                                this.playMayaResponse(data.audio_data);
                            }
                        } else if (data.type === 'assessment_complete') {
                            // Final assessment results
                            conversationData.assessment_feedback = data.feedback;
                            conversationData.conversation_id = data.conversation_id;
                            
                            ws.close();
                            resolve(conversationData);
                        } else if (data.type === 'error') {
                            ws.close();
                            reject(new Error(data.message));
                        }
                    } catch (parseError) {
                        console.error('WebSocket message parse error:', parseError);
                    }
                };
                
                ws.onerror = (error) => {
                    console.error('Nova Sonic WebSocket error:', error);
                    reject(new Error('WebSocket connection failed'));
                };
                
                ws.onclose = () => {
                    console.log('Nova Sonic WebSocket closed');
                    this.activeWebSocket = null;
                };
                
                // Timeout after 30 seconds
                setTimeout(() => {
                    if (ws.readyState !== WebSocket.CLOSED) {
                        ws.close();
                        reject(new Error('Nova Sonic conversation timeout'));
                    }
                }, 30000);
                
            } catch (error) {
                reject(error);
            }
        });
    }
    
    playMayaResponse(audioData) {
        try {
            // Convert base64 audio to playable format
            const audioBlob = new Blob([atob(audioData)], { type: 'audio/wav' });
            const audioUrl = URL.createObjectURL(audioBlob);
            const audio = new Audio(audioUrl);
            
            audio.play().catch(error => {
                console.warn('Audio playback failed:', error);
            });
            
            // Clean up URL after playback
            audio.onended = () => {
                URL.revokeObjectURL(audioUrl);
            };
        } catch (error) {
            console.warn('Maya audio response playback failed:', error);
        }
    }
    
    // Nova Micro writing assessment (uses regional endpoint)
    async submitWritingAssessment(essayText, prompt, assessmentType = 'academic_writing') {
        try {
            const response = await this.makeAPICall('/api/nova-micro/writing', 'POST', {
                essay_text: essayText,
                prompt: prompt,
                assessment_type: assessmentType
            });
            
            return {
                success: true,
                data: response
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    // In-app purchase verification
    async verifyApplePurchase(receiptData, productId) {
        try {
            const response = await this.makeAPICall('/api/purchase/verify-apple', 'POST', {
                receipt_data: receiptData,
                product_id: productId
            });
            
            return {
                success: true,
                data: response
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    async verifyGooglePurchase(purchaseToken, productId) {
        try {
            const response = await this.makeAPICall('/api/purchase/verify-google', 'POST', {
                purchase_token: purchaseToken,
                product_id: productId
            });
            
            return {
                success: true,
                data: response
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    // Helper methods
    async storeSession(sessionId) {
        try {
            localStorage.setItem('ielts_session_id', sessionId);
        } catch (error) {
            console.warn('Failed to store session:', error);
        }
    }
    
    async loadSession() {
        try {
            const sessionId = localStorage.getItem('ielts_session_id');
            if (sessionId) {
                this.sessionId = sessionId;
                return sessionId;
            }
        } catch (error) {
            console.warn('Failed to load session:', error);
        }
        return null;
    }
    
    async showLatencyNotification() {
        // Show user-friendly notification about Nova Sonic routing
        const message = 'Connecting to our speech assessment service in North America. This may take a few extra seconds for optimal AI processing.';
        
        try {
            // Use Capacitor Toast plugin
            const { Toast } = await import('@capacitor/toast');
            await Toast.show({
                text: message,
                duration: 'long',
                position: 'top'
            });
        } catch (error) {
            console.log('Toast notification failed, using fallback:', error);
            console.log(message);
        }
    }
    
    async showToastNotification(message, duration = 'short', position = 'bottom') {
        try {
            const { Toast } = await import('@capacitor/toast');
            await Toast.show({
                text: message,
                duration: duration,
                position: position
            });
        } catch (error) {
            console.log('Toast failed:', message);
        }
    }
    
    async showPurchaseConfirmation(productTitle) {
        await this.showToastNotification(
            `Purchase successful! ${productTitle} unlocked.`,
            'long',
            'center'
        );
    }
    
    async showNetworkError() {
        await this.showToastNotification(
            'Network error. Please check your connection and try again.',
            'long',
            'center'
        );
    }
    
    // Health check
    async checkHealth() {
        try {
            const response = await this.makeAPICall('/health', 'GET', null, { timeout: 5000 });
            return {
                success: true,
                region: this.userRegion,
                endpoint: this.getRegionalEndpoint(),
                data: response
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }
}

// Global API client instance
const apiClient = new MobileAPIClient();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MobileAPIClient;
}

// Initialize when script loads
document.addEventListener('DOMContentLoaded', function() {
    // Make available globally for Capacitor app
    window.apiClient = apiClient;
    console.log('Mobile API client initialized for AWS Lambda backend');
});