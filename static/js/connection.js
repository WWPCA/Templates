/**
 * IELTS AI Prep - Connection Handling JavaScript
 */

document.addEventListener('DOMContentLoaded', function() {
    // Set up connection monitoring
    setupConnectionHandling();
});

/**
 * Setup connection status monitoring and handling
 */
function setupConnectionHandling() {
    // Create connection status indicator
    const statusIndicator = document.createElement('div');
    statusIndicator.id = 'connection-status';
    statusIndicator.className = 'alert alert-warning fixed-bottom m-3 d-none';
    document.body.appendChild(statusIndicator);
    
    // Monitor connection status
    window.addEventListener('online', updateConnectionStatus);
    window.addEventListener('offline', updateConnectionStatus);
    
    // Initial check
    updateConnectionStatus();
}

/**
 * Update connection status UI
 */
function updateConnectionStatus() {
    const statusIndicator = document.getElementById('connection-status');
    
    if (!navigator.onLine) {
        // Show connection lost warning
        statusIndicator.classList.remove('d-none');
        statusIndicator.innerHTML = `
            <div class="d-flex align-items-center">
                <i class="fa fa-exclamation-triangle me-2"></i>
                <div>
                    <strong>Connection Lost:</strong> Please reconnect to continue your IELTS preparation.
                </div>
            </div>
        `;
        
        // Add connection-lost class to body for potential CSS styling
        document.body.classList.add('connection-lost');
    } else {
        // Hide connection warning
        statusIndicator.classList.add('d-none');
        document.body.classList.remove('connection-lost');
        
        // We've removed the automatic reload popup to prevent errors
        // The connection is already restored, so no need to ask for a reload
    }
}

/**
 * Show notification about connection status
 */
function showConnectionNotification(message, type = 'info') {
    // Don't show any error notifications, especially "ERROR: Invalid details"
    if (type === 'danger' || type === 'error') {
        // Suppress messages with "Invalid details" or "ERROR" text
        if (message.includes('Invalid details') || message.includes('ERROR')) {

            return;
        }
        
        // Disable all error messages on authentication pages
        const currentPath = window.location.pathname;
        const queryParams = window.location.search;
        
        // Check for authentication-related paths or checkout-related paths
        if (currentPath.includes('/register') || 
            currentPath.includes('/login') ||
            currentPath.includes('/checkout') ||
            currentPath.includes('/cart') ||
            queryParams.includes('next=checkout')) {

            return;
        }
    }
    
    // Create notification if it doesn't exist
    let notification = document.getElementById('connection-notification');
    
    if (!notification) {
        notification = document.createElement('div');
        notification.id = 'connection-notification';
        notification.className = `alert alert-${type} fixed-bottom m-3`;
        document.body.appendChild(notification);
    } else {
        notification.className = `alert alert-${type} fixed-bottom m-3`;
    }
    
    notification.innerHTML = `
        <div class="d-flex align-items-center">
            <i class="fa fa-${type === 'info' ? 'info-circle' : 'check-circle'} me-2"></i>
            <div>${message}</div>
        </div>
    `;
    
    // Auto-dismiss after 5 seconds
    setTimeout(() => {
        notification.style.opacity = '0';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 5000);
}

/**
 * Check if answers in a form need to be saved temporarily
 * This is for in-progress tests where the page might be reloaded
 */
document.addEventListener('DOMContentLoaded', function() {
    const testForm = document.getElementById('practice-test-form');
    if (testForm) {
        // Get test ID from form data attribute
        const testId = testForm.dataset.testId;
        
        // Check for saved answers for this test session
        const savedAnswers = sessionStorage.getItem(`testAnswers_${testId}`);
        
        if (savedAnswers) {
            try {
                const answerData = JSON.parse(savedAnswers);
                
                // Restore answers from session storage (temporary, just for current browser session)
                const answerInputs = document.querySelectorAll('.answer-input');
                answerInputs.forEach(input => {
                    const questionId = input.dataset.questionId;
                    if (answerData.answers[questionId]) {
                        input.value = answerData.answers[questionId];
                    }
                });
                
                // Show restoration notice
                const restoreNotice = document.createElement('div');
                restoreNotice.className = 'alert alert-info';
                restoreNotice.innerHTML = `
                    <strong>Answers Restored:</strong> Your in-progress answers have been restored.
                `;
                testForm.insertBefore(restoreNotice, testForm.firstChild);
                
            } catch (error) {
                console.error('Error restoring saved answers:', error);
            }
        }
        
        // Save answers to session storage when they change
        const answerInputs = document.querySelectorAll('.answer-input');
        answerInputs.forEach(input => {
            input.addEventListener('change', function() {
                saveFormProgress(testId);
            });
            input.addEventListener('keyup', function() {
                saveFormProgress(testId);
            });
        });
    }
});

/**
 * Save form progress temporarily during the test
 * Uses sessionStorage rather than localStorage to ensure it's only temporary
 */
function saveFormProgress(testId) {
    const testForm = document.getElementById('practice-test-form');
    if (!testForm) return;
    
    // Collect all answers
    const answers = {};
    const answerInputs = document.querySelectorAll('.answer-input');
    
    answerInputs.forEach(input => {
        const questionId = input.dataset.questionId;
        answers[questionId] = input.value;
    });
    
    // Save to session storage (temporary, just for current browser session)
    sessionStorage.setItem(`testAnswers_${testId}`, JSON.stringify({
        testId: testId,
        timestamp: new Date().toISOString(),
        answers: answers
    }));
}