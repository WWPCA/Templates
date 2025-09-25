/**
 * GDPR Cookie Consent Banner for IELTS GenAI Prep
 * Handles user cookie preferences and compliance
 */

class CookieConsent {
    constructor() {
        this.consentKey = 'ielts_cookie_consent';
        this.preferencesKey = 'ielts_cookie_preferences';
        this.bannerShown = false;
        this.init();
    }

    init() {
        // Check if consent has already been given
        const consent = this.getStoredConsent();
        if (!consent) {
            this.showConsentBanner();
        } else {
            this.applyStoredPreferences();
        }
    }

    getStoredConsent() {
        return localStorage.getItem(this.consentKey);
    }

    getStoredPreferences() {
        const prefs = localStorage.getItem(this.preferencesKey);
        return prefs ? JSON.parse(prefs) : null;
    }

    showConsentBanner() {
        if (this.bannerShown) return;
        
        const banner = this.createBanner();
        document.body.appendChild(banner);
        this.bannerShown = true;
        
        // Add backdrop
        document.body.classList.add('cookie-banner-active');
    }

    createBanner() {
        const banner = document.createElement('div');
        banner.id = 'cookie-consent-banner';
        banner.className = 'cookie-consent-banner';
        
        banner.innerHTML = `
            <div class="cookie-banner-content">
                <div class="cookie-banner-header">
                    <h3>🍪 Cookie Settings</h3>
                    <p>We use cookies to enhance your experience on IELTS GenAI Prep. Please choose your preferences:</p>
                </div>
                
                <div class="cookie-categories">
                    <div class="cookie-category">
                        <div class="cookie-category-header">
                            <label class="cookie-toggle">
                                <input type="checkbox" id="essential-cookies" checked disabled>
                                <span class="toggle-slider essential"></span>
                                <span class="toggle-label">Essential Cookies</span>
                            </label>
                        </div>
                        <p class="cookie-description">Required for the website to function properly. These cannot be disabled.</p>
                    </div>
                    
                    <div class="cookie-category">
                        <div class="cookie-category-header">
                            <label class="cookie-toggle">
                                <input type="checkbox" id="analytics-cookies">
                                <span class="toggle-slider"></span>
                                <span class="toggle-label">Analytics Cookies</span>
                            </label>
                        </div>
                        <p class="cookie-description">Help us understand how visitors interact with our website to improve performance.</p>
                    </div>
                    
                    <div class="cookie-category">
                        <div class="cookie-category-header">
                            <label class="cookie-toggle">
                                <input type="checkbox" id="preferences-cookies" checked>
                                <span class="toggle-slider"></span>
                                <span class="toggle-label">Preference Cookies</span>
                            </label>
                        </div>
                        <p class="cookie-description">Remember your settings and preferences for a better experience.</p>
                    </div>
                    
                    <div class="cookie-category">
                        <div class="cookie-category-header">
                            <label class="cookie-toggle">
                                <input type="checkbox" id="marketing-cookies">
                                <span class="toggle-slider"></span>
                                <span class="toggle-label">Marketing Cookies</span>
                            </label>
                        </div>
                        <p class="cookie-description">Used to deliver relevant advertisements and track campaign effectiveness.</p>
                    </div>
                </div>
                
                <div class="cookie-banner-actions">
                    <button class="btn-cookie btn-accept-all" onclick="cookieConsent.acceptAll()">
                        Accept All
                    </button>
                    <button class="btn-cookie btn-save-preferences" onclick="cookieConsent.savePreferences()">
                        Save Preferences
                    </button>
                    <button class="btn-cookie btn-reject-all" onclick="cookieConsent.rejectAll()">
                        Reject All
                    </button>
                </div>
                
                <div class="cookie-banner-footer">
                    <p>
                        <a href="/privacy-policy" target="_blank">Privacy Policy</a> | 
                        <a href="/cookie-policy" target="_blank">Cookie Policy</a>
                    </p>
                </div>
            </div>
        `;
        
        return banner;
    }

    acceptAll() {
        const preferences = {
            essential: true,
            analytics: true,
            preferences: true,
            marketing: true,
            timestamp: new Date().toISOString()
        };
        
        this.saveConsentData(preferences);
        this.hideBanner();
        this.applyPreferences(preferences);
    }

    rejectAll() {
        const preferences = {
            essential: true,
            analytics: false,
            preferences: false,
            marketing: false,
            timestamp: new Date().toISOString()
        };
        
        this.saveConsentData(preferences);
        this.hideBanner();
        this.applyPreferences(preferences);
    }

    savePreferences() {
        const preferences = {
            essential: true, // Always true
            analytics: document.getElementById('analytics-cookies').checked,
            preferences: document.getElementById('preferences-cookies').checked,
            marketing: document.getElementById('marketing-cookies').checked,
            timestamp: new Date().toISOString()
        };
        
        this.saveConsentData(preferences);
        this.hideBanner();
        this.applyPreferences(preferences);
    }

    saveConsentData(preferences) {
        // Store consent locally
        localStorage.setItem(this.consentKey, 'given');
        localStorage.setItem(this.preferencesKey, JSON.stringify(preferences));
        
        // Send to server for GDPR compliance tracking
        this.sendConsentToServer(preferences);
    }

    sendConsentToServer(preferences) {
        fetch('/api/cookie-consent', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': this.getCSRFToken()
            },
            body: JSON.stringify({
                consent_type: 'cookie_preferences',
                preferences: preferences,
                consent_given: true,
                version: '1.0'
            })
        }).catch(error => {
            console.log('Failed to save consent to server:', error);
        });
    }

    getCSRFToken() {
        const token = document.querySelector('meta[name="csrf-token"]');
        return token ? token.getAttribute('content') : '';
    }

    hideBanner() {
        const banner = document.getElementById('cookie-consent-banner');
        if (banner) {
            banner.remove();
            document.body.classList.remove('cookie-banner-active');
        }
    }

    applyStoredPreferences() {
        const preferences = this.getStoredPreferences();
        if (preferences) {
            this.applyPreferences(preferences);
        }
    }

    applyPreferences(preferences) {
        // Apply analytics cookies
        if (preferences.analytics) {
            this.enableAnalytics();
        } else {
            this.disableAnalytics();
        }
        
        // Apply marketing cookies
        if (preferences.marketing) {
            this.enableMarketing();
        } else {
            this.disableMarketing();
        }
        
        // Apply preference cookies (always enabled for basic functionality)
        if (preferences.preferences) {
            this.enablePreferences();
        }
        
        console.log('Cookie preferences applied:', preferences);
    }

    enableAnalytics() {
        // Enable Google Analytics or other analytics tools
        if (typeof gtag !== 'undefined') {
            gtag('consent', 'update', {
                'analytics_storage': 'granted'
            });
        }
    }

    disableAnalytics() {
        // Disable analytics tracking
        if (typeof gtag !== 'undefined') {
            gtag('consent', 'update', {
                'analytics_storage': 'denied'
            });
        }
    }

    enableMarketing() {
        // Enable marketing/advertising cookies
        if (typeof gtag !== 'undefined') {
            gtag('consent', 'update', {
                'ad_storage': 'granted'
            });
        }
    }

    disableMarketing() {
        // Disable marketing cookies
        if (typeof gtag !== 'undefined') {
            gtag('consent', 'update', {
                'ad_storage': 'denied'
            });
        }
    }

    enablePreferences() {
        // Enable preference cookies (theme, language, etc.)
        document.body.setAttribute('data-preferences-enabled', 'true');
    }

    // Public method to show settings again
    showSettings() {
        this.bannerShown = false;
        this.showConsentBanner();
    }

    // Method to check if specific cookie type is allowed
    isAllowed(cookieType) {
        const preferences = this.getStoredPreferences();
        if (!preferences) return false;
        return preferences[cookieType] === true;
    }
}

// Initialize cookie consent when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    window.cookieConsent = new CookieConsent();
});

// Utility function for other scripts to check cookie consent
window.checkCookieConsent = function(cookieType) {
    return window.cookieConsent ? window.cookieConsent.isAllowed(cookieType) : false;
};