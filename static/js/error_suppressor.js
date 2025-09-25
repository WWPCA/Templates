/**
 * IELTS GenAI Prep - Minimal Error Suppressor
 * Basic error handling without aggressive DOM manipulation
 */

// Minimal error handling only
window.addEventListener('error', function(e) {
  // Only suppress specific non-critical errors
  if (e.message && (e.message.includes('Script error') || e.message.includes('Non-Error promise rejection'))) {
    e.preventDefault();
  }
});