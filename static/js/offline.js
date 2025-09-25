/**
 * IELTS AI Prep - Offline Mode JavaScript
 */

document.addEventListener('DOMContentLoaded', function() {
    // Check for offline data to sync when back online
    window.addEventListener('online', syncOfflineData);
    
    // Try sync on page load in case we're online now but have offline data
    if (navigator.onLine) {
        syncOfflineData();
    }
});

/**
 * Sync any cached offline test attempts when back online
 */
function syncOfflineData() {
    if (!navigator.onLine) return;
    
    // Check for offline test attempts
    const offlineTests = JSON.parse(localStorage.getItem('offlineTests') || '[]');
    
    if (offlineTests.length > 0) {
        console.log(`Found ${offlineTests.length} offline test attempts to sync`);
        
        // Show syncing notification
        showSyncingNotification(offlineTests.length);
        
        // Send to server for syncing
        fetch('/api/sync', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                test_attempts: offlineTests
            })
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            if (data.success) {
                // Clear synced tests from local storage
                localStorage.removeItem('offlineTests');
                
                // Show success message
                showSyncSuccessNotification(offlineTests.length);
            } else {
                console.error('Sync failed:', data.error);
            }
        })
        .catch(error => {
            console.error('Error syncing offline data:', error);
            // Leave the data in localStorage to try again later
        });
    }
}

/**
 * Show notification that syncing is in progress
 */
function showSyncingNotification(count) {
    // Create notification if it doesn't exist
    let notification = document.getElementById('sync-notification');
    
    if (!notification) {
        notification = document.createElement('div');
        notification.id = 'sync-notification';
        notification.className = 'alert alert-info fixed-bottom m-3';
        document.body.appendChild(notification);
    }
    
    notification.innerHTML = `
        <div class="d-flex align-items-center">
            <div class="spinner-border spinner-border-sm me-2" role="status">
                <span class="visually-hidden">Loading...</span>
            </div>
            <div>
                Syncing ${count} offline test attempt${count > 1 ? 's' : ''}...
            </div>
        </div>
    `;
}

/**
 * Show success notification after syncing
 */
function showSyncSuccessNotification(count) {
    // Update existing notification
    let notification = document.getElementById('sync-notification');
    
    if (!notification) {
        notification = document.createElement('div');
        notification.id = 'sync-notification';
        notification.className = 'alert alert-success fixed-bottom m-3';
        document.body.appendChild(notification);
    } else {
        notification.className = 'alert alert-success fixed-bottom m-3';
    }
    
    notification.innerHTML = `
        <div class="d-flex align-items-center">
            <i class="fa fa-check-circle me-2"></i>
            <div>
                Successfully synced ${count} offline test attempt${count > 1 ? 's' : ''}!
            </div>
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
 * Load cached test data when offline
 */
function loadCachedTestData(testId) {
    const cachedTest = localStorage.getItem(`cachedTest_${testId}`);
    
    if (cachedTest) {
        try {
            const testData = JSON.parse(cachedTest);
            
            // Insert cached content
            const testContainer = document.querySelector('.practice-test');
            if (testContainer) {
                testContainer.innerHTML = testData.content;
                
                // Re-attach event listeners
                const testForm = document.getElementById('practice-test-form');
                if (testForm) {
                    testForm.addEventListener('submit', submitTest);
                }
                
                // Display offline notice
                const offlineNotice = document.createElement('div');
                offlineNotice.className = 'alert alert-warning';
                offlineNotice.innerHTML = `
                    <strong>Offline Mode:</strong> You are viewing a cached version of this test.
                    Your answers will be saved locally and synced when you're back online.
                `;
                testContainer.insertBefore(offlineNotice, testContainer.firstChild);
                
                return true;
            }
        } catch (error) {
            console.error('Error loading cached test:', error);
        }
    }
    
    return false;
}

/**
 * Check if we need to restore answers from localStorage
 */
document.addEventListener('DOMContentLoaded', function() {
    const testForm = document.getElementById('practice-test-form');
    if (testForm) {
        const testId = testForm.dataset.testId;
        const savedAnswers = localStorage.getItem(`testAnswers_${testId}`);
        
        if (savedAnswers) {
            try {
                const answerData = JSON.parse(savedAnswers);
                
                // Restore answers
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
                    <strong>Answers Restored:</strong> Your previous answers for this test have been restored.
                `;
                testForm.insertBefore(restoreNotice, testForm.firstChild);
                
            } catch (error) {
                console.error('Error restoring saved answers:', error);
            }
        }
    }
});
