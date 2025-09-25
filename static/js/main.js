/**
 * IELTS AI Prep - Main JavaScript
 */

document.addEventListener('DOMContentLoaded', function() {
    // Mobile menu toggle with enhanced functionality
    const menuToggle = document.getElementById('mobileMenuToggle');
    const closeNavBtn = document.getElementById('closeNav');
    const mainNav = document.getElementById('mobileNav');
    
    // Toggle menu when hamburger icon is clicked
    if (menuToggle && mainNav) {
        menuToggle.addEventListener('click', function(e) {
            e.preventDefault();
            mainNav.classList.toggle('active');
            document.body.classList.toggle('menu-open');
        });
    }
    
    // Close menu when X button is clicked
    if (closeNavBtn && mainNav) {
        closeNavBtn.addEventListener('click', function(e) {
            e.preventDefault();
            mainNav.classList.remove('active');
            document.body.classList.remove('menu-open');
        });
    }
    
    // Close menu when clicking outside
    document.addEventListener('click', function(e) {
        if (mainNav && mainNav.classList.contains('active') && 
            !mainNav.contains(e.target) && 
            e.target !== menuToggle) {
            mainNav.classList.remove('active');
            document.body.classList.remove('menu-open');
        }
    });
    
    // Close menu when nav links are clicked (for mobile)
    const navLinks = document.querySelectorAll('.main-nav a');
    navLinks.forEach(link => {
        link.addEventListener('click', function() {
            // Only on mobile screens
            if (window.innerWidth <= 768) {
                mainNav.classList.remove('active');
                document.body.classList.remove('menu-open');
            }
        });
    });
    
    // Flash message auto-dismiss
    const flashMessages = document.querySelectorAll('.alert');
    flashMessages.forEach(function(message) {
        setTimeout(function() {
            message.style.opacity = '0';
            setTimeout(function() {
                message.style.display = 'none';
            }, 300);
        }, 5000);
    });
    
    // Clean up any error notifications that might be showing on page load
    // This addresses the "ERROR: Invalid details" message appearing in the bottom right
    const errorNotifications = document.querySelectorAll('.alert-danger, .alert-error');
    errorNotifications.forEach(function(notification) {
        if (notification.textContent.includes('ERROR') || notification.textContent.includes('Invalid details')) {
            notification.remove();
        }
    });
    
    // Also remove any fixed-position notifications in the bottom-right that might be error messages
    const fixedNotifications = document.querySelectorAll('div[style*="position: fixed"][style*="bottom"][style*="right"]');
    fixedNotifications.forEach(function(notification) {
        if (notification.textContent.includes('ERROR') || notification.textContent.includes('Invalid details')) {
            notification.remove();
        }
    });
    
    // Check device capabilities
    checkDeviceCapabilities();
    
    // Connection status monitoring
    checkConnectionStatus();
    
    // Check for slow connection and enable low-bandwidth mode if needed
    checkConnectionSpeed();
    
    // App only available in English - no language selector
});

/**
 * Check device capabilities for IELTS test preparation
 * Displays warnings if device does not meet minimum requirements
 */
function checkDeviceCapabilities() {
    // Check for audio recording capability (needed for speaking assessment)
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {

    } else {
        console.warn('Audio recording is not supported on this device');
        // Display warning if on speaking assessment page
        if (window.location.pathname.includes('/speaking')) {
            showDeviceWarning('Your device does not support audio recording, which is required for the speaking assessment.');
        }
    }
    
    // Check for audio playback capability (needed for listening tests)
    const audio = document.createElement('audio');
    if (audio.canPlayType) {
        const canPlayMP3 = audio.canPlayType('audio/mpeg') !== '';
        if (canPlayMP3) {

        } else {
            console.warn('MP3 audio playback is not supported on this device');
            // Display warning if on listening test page
            if (window.location.pathname.includes('/practice/listening')) {
                showDeviceWarning('Your device does not support MP3 audio playback, which is required for the listening tests.');
            }
        }
    }
    
    // Check available memory (rough estimate)
    if (navigator.deviceMemory) {

        if (navigator.deviceMemory < 2) {
            console.warn('Device has limited memory which may affect performance');
            showDeviceWarning('Your device has limited memory which may affect the performance of some features.');
        }
    }
}

/**
 * Display a device warning message to the user
 */
function showDeviceWarning(message) {
    const warningDiv = document.createElement('div');
    warningDiv.className = 'alert alert-warning';
    warningDiv.innerHTML = `<strong>Device Warning:</strong> ${message}`;
    
    const container = document.querySelector('.container');
    if (container) {
        container.insertBefore(warningDiv, container.firstChild);
    }
}

/**
 * Check connection status and show an indicator when connection is lost
 */
function checkConnectionStatus() {
    const connectionIndicator = document.createElement('div');
    connectionIndicator.className = 'connection-indicator';
    connectionIndicator.textContent = 'Connection lost. Please reconnect to continue.';
    document.body.appendChild(connectionIndicator);
    
    function updateConnectionStatus() {
        if (!navigator.onLine) {
            connectionIndicator.classList.add('visible');
            document.body.classList.add('connection-lost');
        } else {
            connectionIndicator.classList.remove('visible');
            document.body.classList.remove('connection-lost');
            
            // We've removed the automatic reload confirmation to prevent popup errors
        }
    }
    
    window.addEventListener('online', updateConnectionStatus);
    window.addEventListener('offline', updateConnectionStatus);
    updateConnectionStatus();
}

/**
 * Check connection speed and enable low-bandwidth mode if needed
 * Uses a flag to prevent multiple event listeners
 */
function checkConnectionSpeed() {
    // Add a flag to window to prevent duplicate checks
    if (window.bandwidthCheckInitialized) {
        return;
    }
    window.bandwidthCheckInitialized = true;
    
    // Check if the Network Information API is available
    if ('connection' in navigator && navigator.connection.effectiveType) {
        const connectionType = navigator.connection.effectiveType;
        

        
        // Enable low-bandwidth mode for slow connections
        if (connectionType === '2g' || connectionType === 'slow-2g') {
            enableLowBandwidthMode();
        }
        
        // Listen for connection changes - only add the listener once
        navigator.connection.addEventListener('change', function() {
            if (navigator.connection.effectiveType === '2g' || 
                navigator.connection.effectiveType === 'slow-2g') {
                enableLowBandwidthMode();
            } else {
                disableLowBandwidthMode();
            }
        });
    } else {
        // If API not available, do a simple test - but only once
        simpleBandwidthCheck();
    }
}

/**
 * Simple bandwidth check by loading a small test file
 */
function simpleBandwidthCheck() {
    const startTime = Date.now();
    const testFile = '/static/css/style.css'; // Use existing CSS file as test
    
    fetch(testFile)
        .then(response => response.text())
        .then(data => {
            const endTime = Date.now();
            const duration = endTime - startTime;
            const fileSizeKB = data.length / 1024;
            const speedKBps = fileSizeKB / (duration / 1000);
            

            
            if (speedKBps < 50) { // Very slow connection
                enableLowBandwidthMode();
            }
        })
        .catch(error => {
            console.error('Error measuring bandwidth:', error);
        });
}

/**
 * Enable low-bandwidth mode for slow connections
 */
function enableLowBandwidthMode() {
    // Only enable if not already in low-bandwidth mode
    if (!document.body.classList.contains('low-bandwidth-mode')) {
        document.body.classList.add('low-bandwidth-mode');
        console.log('Low-bandwidth mode enabled');
        
        // Remove any existing bandwidth notifications first
        const existingNotifications = document.querySelectorAll('.bandwidth-notification');
        existingNotifications.forEach(notification => notification.remove());
        
        // Notify user with a more compact message
        const notification = document.createElement('div');
        notification.className = 'alert alert-info bandwidth-notification';
        notification.style.padding = '8px 15px';
        notification.style.marginBottom = '10px';
        notification.style.fontSize = '0.9rem';
        notification.style.position = 'fixed';
        notification.style.top = '10px';
        notification.style.right = '10px';
        notification.style.zIndex = '9999';
        notification.style.maxWidth = '300px';
        notification.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';
        notification.innerHTML = 'Low-bandwidth mode enabled';
        
        document.body.appendChild(notification);
        
        // Auto-dismiss after 5 seconds
        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transition = 'opacity 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }, 5000);
        
        // Prevent loading of non-essential resources
        const images = document.querySelectorAll('img:not([data-essential="true"])');
        images.forEach(img => {
            img.setAttribute('loading', 'lazy');
            img.style.display = 'none';
        });
    }
}

/**
 * Disable low-bandwidth mode
 */
function disableLowBandwidthMode() {
    if (document.body.classList.contains('low-bandwidth-mode')) {
        document.body.classList.remove('low-bandwidth-mode');
        console.log('Low-bandwidth mode disabled');
        
        // Remove any existing bandwidth notifications first
        const existingNotifications = document.querySelectorAll('.bandwidth-notification');
        existingNotifications.forEach(notification => notification.remove());
        
        // Restore images
        const images = document.querySelectorAll('img[loading="lazy"]');
        images.forEach(img => {
            img.style.display = '';
        });
    }
}

/**
 * Utility function to format a timestamp as mm:ss
 */
function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
}
