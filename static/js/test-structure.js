// This script ensures the blue info box stays visible across all test structure pages
document.addEventListener('DOMContentLoaded', function() {
    // Add persistent info box to all test structure pages if it doesn't exist
    const infoBoxExists = document.querySelector('.alert-info');
    const isTestStructurePage = window.location.pathname.includes('/test-structure');
    
    if (isTestStructurePage && !infoBoxExists) {
        const infoBox = document.createElement('div');
        infoBox.className = 'alert alert-info mb-4';
        infoBox.innerHTML = `
            <div class="d-flex">
                <div class="me-3">
                    <i class="fas fa-info-circle fa-2x"></i>
                </div>
                <div>
                    <h4>About the IELTS Test</h4>
                    <p class="mb-0">The International English Language Testing System (IELTS) assesses the English language proficiency of people who want to study or work in environments where English is used as the language of communication.</p>
                </div>
            </div>
        `;
        
        // Insert at the beginning of the content area
        const contentArea = document.querySelector('.test-structure-content');
        if (contentArea) {
            const heading = contentArea.querySelector('h1');
            if (heading) {
                heading.after(infoBox);
            } else {
                contentArea.prepend(infoBox);
            }
        }
    }
});