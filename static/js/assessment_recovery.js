/**
 * Assessment Recovery System - Client-Side Implementation
 * 
 * Provides automatic state saving and connection monitoring for speaking assessments.
 * Ensures users can recover their progress if technical issues occur.
 */

class AssessmentRecovery {
    constructor() {
        this.saveInterval = 30000; // Save every 30 seconds
        this.autoSaveTimer = null;
        this.isConnected = navigator.onLine;
        this.lastSaveTime = null;
        this.pendingSave = false;
        this.init();
    }
    
    init() {
        console.log('Initializing Assessment Recovery System...');
        this.startAutoSave();
        this.monitorConnection();
        this.handlePageEvents();
        this.createRecoveryUI();
    }
    
    startAutoSave() {
        this.autoSaveTimer = setInterval(() => {
            if (this.isConnected && !this.pendingSave) {
                this.saveCurrentState();
            }
        }, this.saveInterval);
        
        console.log('Auto-save enabled: Every 30 seconds');
    }
    
    saveCurrentState() {
        const assessmentId = window.currentAssessmentId;
        const conversationState = window.conversationState;
        
        if (!assessmentId || !conversationState) {
            console.log('No assessment data to save');
            return;
        }
        
        if (this.pendingSave) {
            console.log('Save already in progress, skipping...');
            return;
        }
        
        this.pendingSave = true;
        this.updateSaveIndicator('saving');
        
        fetch('/recovery/save-state', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Requested-With': 'XMLHttpRequest'
            },
            body: JSON.stringify({
                assessment_id: assessmentId,
                conversation_state: conversationState
            })
        })
        .then(response => response.json())
        .then(data => {
            this.pendingSave = false;
            if (data.success) {
                this.lastSaveTime = new Date();
                this.updateSaveIndicator('saved');
                console.log('Assessment state saved successfully');
            } else {
                this.updateSaveIndicator('error');
                console.error('Failed to save state:', data.error);
            }
        })
        .catch(error => {
            this.pendingSave = false;
            this.updateSaveIndicator('error');
            console.error('Network error while saving state:', error);
        });
    }
    
    monitorConnection() {
        window.addEventListener('online', () => {
            this.isConnected = true;
            this.hideConnectionWarning();
            console.log('Connection restored');
            
            // Save immediately when back online
            setTimeout(() => {
                this.saveCurrentState();
            }, 1000);
        });
        
        window.addEventListener('offline', () => {
            this.isConnected = false;
            this.showConnectionWarning();
            console.log('Connection lost');
        });
        
        // Monitor connection status periodically
        setInterval(() => {
            if (!navigator.onLine && this.isConnected) {
                this.isConnected = false;
                this.showConnectionWarning();
            } else if (navigator.onLine && !this.isConnected) {
                this.isConnected = true;
                this.hideConnectionWarning();
            }
        }, 5000);
    }
    
    handlePageEvents() {
        // Save before page unload
        window.addEventListener('beforeunload', (e) => {
            if (window.currentAssessmentId && window.conversationState) {
                // Use sendBeacon for reliable last-minute saving
                const data = JSON.stringify({
                    assessment_id: window.currentAssessmentId,
                    conversation_state: window.conversationState
                });
                
                navigator.sendBeacon('/recovery/save-state', data);
            }
        });
        
        // Save on page visibility change (tab switching)
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'hidden') {
                this.saveCurrentState();
            }
        });
        
        // Save on focus lost (user clicks elsewhere)
        window.addEventListener('blur', () => {
            this.saveCurrentState();
        });
    }
    
    createRecoveryUI() {
        // Create save indicator
        const indicator = document.createElement('div');
        indicator.id = 'save-indicator';
        indicator.className = 'position-fixed bottom-0 end-0 m-3 p-2 rounded bg-light border';
        indicator.style.zIndex = '1050';
        indicator.style.fontSize = '0.875rem';
        indicator.style.display = 'none';
        indicator.innerHTML = `
            <div class="d-flex align-items-center">
                <div id="save-status" class="me-2"></div>
                <span id="save-text">Progress saved</span>
            </div>
        `;
        document.body.appendChild(indicator);
        
        // Create manual save button
        const saveButton = document.createElement('button');
        saveButton.id = 'manual-save-btn';
        saveButton.className = 'btn btn-sm btn-outline-primary position-fixed bottom-0 start-0 m-3';
        saveButton.style.zIndex = '1050';
        saveButton.innerHTML = '<i class="fas fa-save me-1"></i>Save Progress';
        saveButton.onclick = () => this.manualSave();
        document.body.appendChild(saveButton);
    }
    
    updateSaveIndicator(status) {
        const indicator = document.getElementById('save-indicator');
        const statusIcon = document.getElementById('save-status');
        const statusText = document.getElementById('save-text');
        
        if (!indicator) return;
        
        indicator.style.display = 'block';
        
        switch (status) {
            case 'saving':
                statusIcon.innerHTML = '<i class="fas fa-spinner fa-spin text-primary"></i>';
                statusText.textContent = 'Saving...';
                indicator.className = 'position-fixed bottom-0 end-0 m-3 p-2 rounded bg-light border border-primary';
                break;
                
            case 'saved':
                statusIcon.innerHTML = '<i class="fas fa-check-circle text-success"></i>';
                statusText.textContent = 'Progress saved';
                indicator.className = 'position-fixed bottom-0 end-0 m-3 p-2 rounded bg-light border border-success';
                
                // Hide after 3 seconds
                setTimeout(() => {
                    indicator.style.display = 'none';
                }, 3000);
                break;
                
            case 'error':
                statusIcon.innerHTML = '<i class="fas fa-exclamation-triangle text-warning"></i>';
                statusText.textContent = 'Save failed - will retry';
                indicator.className = 'position-fixed bottom-0 end-0 m-3 p-2 rounded bg-light border border-warning';
                
                // Hide after 5 seconds
                setTimeout(() => {
                    indicator.style.display = 'none';
                }, 5000);
                break;
        }
    }
    
    showConnectionWarning() {
        // Remove existing warning
        this.hideConnectionWarning();
        
        const warning = document.createElement('div');
        warning.id = 'connection-warning';
        warning.className = 'alert alert-warning position-fixed top-0 start-50 translate-middle-x shadow';
        warning.style.zIndex = '9999';
        warning.style.marginTop = '1rem';
        warning.innerHTML = `
            <div class="d-flex align-items-center">
                <i class="fas fa-wifi me-2"></i>
                <span>Connection lost. Your progress is being saved automatically when reconnected.</span>
                <button type="button" class="btn-close ms-auto" onclick="this.parentElement.parentElement.remove()"></button>
            </div>
        `;
        document.body.appendChild(warning);
    }
    
    hideConnectionWarning() {
        const warning = document.getElementById('connection-warning');
        if (warning) {
            warning.remove();
        }
    }
    
    manualSave() {
        if (!this.isConnected) {
            alert('No internet connection. Progress will be saved when connection is restored.');
            return;
        }
        
        this.saveCurrentState();
        
        // Show feedback
        const button = document.getElementById('manual-save-btn');
        const originalText = button.innerHTML;
        button.innerHTML = '<i class="fas fa-check me-1"></i>Saved!';
        button.disabled = true;
        
        setTimeout(() => {
            button.innerHTML = originalText;
            button.disabled = false;
        }, 2000);
    }
    
    getRecoveryStatus() {
        const assessmentId = window.currentAssessmentId;
        if (!assessmentId) return;
        
        fetch(`/recovery/status?assessment_id=${assessmentId}`)
        .then(response => response.json())
        .then(data => {
            if (data.available) {
                this.showRecoveryOption(data);
            }
        })
        .catch(error => {
            console.error('Failed to check recovery status:', error);
        });
    }
    
    showRecoveryOption(recoveryData) {
        // Create recovery notification
        const notification = document.createElement('div');
        notification.className = 'alert alert-info position-fixed top-0 start-50 translate-middle-x shadow';
        notification.style.zIndex = '9999';
        notification.style.marginTop = '1rem';
        notification.style.maxWidth = '500px';
        notification.innerHTML = `
            <div class="d-flex align-items-center">
                <i class="fas fa-info-circle me-2"></i>
                <div class="flex-grow-1">
                    <strong>Assessment Recovery Available</strong><br>
                    <small>We found a previous session. Would you like to continue?</small>
                </div>
                <div class="ms-2">
                    <a href="/recovery/options/${window.currentAssessmentId}" class="btn btn-sm btn-primary">
                        View Options
                    </a>
                </div>
            </div>
        `;
        document.body.appendChild(notification);
        
        // Auto-remove after 10 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 10000);
    }
    
    stop() {
        if (this.autoSaveTimer) {
            clearInterval(this.autoSaveTimer);
            console.log('Assessment recovery system stopped');
        }
        
        // Remove UI elements
        const indicator = document.getElementById('save-indicator');
        const button = document.getElementById('manual-save-btn');
        const warning = document.getElementById('connection-warning');
        
        if (indicator) indicator.remove();
        if (button) button.remove();
        if (warning) warning.remove();
    }
    
    // Public methods for integration with assessment system
    static init() {
        if (!window.assessmentRecovery) {
            window.assessmentRecovery = new AssessmentRecovery();
        }
        return window.assessmentRecovery;
    }
    
    static save() {
        if (window.assessmentRecovery) {
            window.assessmentRecovery.manualSave();
        }
    }
    
    static stop() {
        if (window.assessmentRecovery) {
            window.assessmentRecovery.stop();
            window.assessmentRecovery = null;
        }
    }
}

// Auto-initialize when script loads
document.addEventListener('DOMContentLoaded', () => {
    // Only initialize if we're on an assessment page
    if (window.currentAssessmentId || document.querySelector('[data-assessment-page]')) {
        AssessmentRecovery.init();
    }
});

// Export for manual usage
window.AssessmentRecovery = AssessmentRecovery;