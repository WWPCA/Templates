#!/usr/bin/env python3
"""
IELTS GenAI Prep - Complete Website UI Package
Full Flask application with all pages and subpages
"""

import os
from flask import Flask, render_template, request, redirect, url_for, flash, jsonify, make_response
from datetime import datetime

# Create Flask app
app = Flask(__name__)
app.secret_key = os.environ.get('SECRET_KEY', 'dev-key-change-in-production')

# Add cache buster for development
@app.context_processor
def inject_cache_buster():
    return {'cache_buster': str(int(datetime.now().timestamp()))}

# Mock user class for template compatibility
class MockUser:
    def __init__(self, authenticated=False):
        self.is_authenticated = authenticated
        self.admin_role = False
        self.username = 'demo_user'
        self.email = 'demo@example.com'
    
    def has_active_assessment_package(self):
        return self.is_authenticated

# Add mock current_user to template context
@app.context_processor
def inject_user():
    # For demo purposes, you can change this to True to see authenticated views
    return {'current_user': MockUser(authenticated=False)}

# Add mock functions for template compatibility
@app.context_processor
def inject_functions():
    return {
        'csrf_token': lambda: 'demo-csrf-token',
        'get_flashed_messages': lambda with_categories=False: []
    }

# Main Routes
@app.route('/')
def index():
    return render_template('index.html', title='Home')

@app.route('/login')
def login():
    return render_template('login.html', title='Login')

@app.route('/register')
def register():
    return render_template('register.html', title='Register')

@app.route('/profile')
def profile():
    return render_template('profile.html', title='My Profile')

@app.route('/logout')
def logout():
    flash('You have been logged out.', 'info')
    return redirect(url_for('index'))

# Assessment Products & Selection
@app.route('/assessment-products')
def assessment_products_page():
    return render_template('assessment_products.html', title='Assessment Products')

@app.route('/assessment-details')
def assessment_details():
    return render_template('assessment_details.html', title='Assessment Details')

@app.route('/academic-speaking-selection')
def academic_speaking_selection():
    return render_template('assessments/speaking_selection.html', title='Academic Speaking Selection')

@app.route('/general-speaking-selection')
def general_speaking_selection():
    return render_template('assessments/general_speaking_selection.html', title='General Speaking Selection')

@app.route('/academic-writing-selection')
def academic_writing_selection():
    return render_template('assessments/academic_writing_selection.html', title='Academic Writing Selection')

@app.route('/general-writing-selection')
def general_writing_selection():
    return render_template('assessments/general_writing_selection.html', title='General Writing Selection')

# Assessment Structure
@app.route('/assessment-structure')
def assessment_structure_index():
    return render_template('assessment_structure/index.html', title='Assessment Structure')

@app.route('/assessment-structure/academic')
def assessment_structure_academic():
    return render_template('assessment_structure/academic.html', title='Academic Assessment Structure')

@app.route('/assessment-structure/general-training')
def assessment_structure_general():
    return render_template('assessment_structure/general_training.html', title='General Training Assessment Structure')

# Practice Tests
@app.route('/practice')
def practice_index():
    return render_template('practice/index.html', title='Practice Tests')

@app.route('/practice/reading')
def practice_reading():
    return render_template('practice/reading.html', title='Reading Practice')

@app.route('/practice/writing')
def practice_writing():
    return render_template('practice/writing.html', title='Writing Practice')

@app.route('/practice/listening')
def practice_listening():
    return render_template('practice/listening.html', title='Listening Practice')

@app.route('/practice/speaking')
def practice_speaking():
    return render_template('practice/speaking.html', title='Speaking Practice')

# Speaking Assessment
@app.route('/speaking-assessment')
def speaking_assessment():
    return render_template('assessments/speaking_assessment.html', title='Speaking Assessment')

@app.route('/speaking-start')
def speaking_start():
    return render_template('assessments/speaking_start.html', title='Start Speaking Assessment')

@app.route('/conversational-speaking')
def conversational_speaking():
    return render_template('assessments/conversational_speaking.html', title='Conversational Speaking')

# Writing Assessment  
@app.route('/writing-assessment')
def writing_assessment():
    return render_template('assessments/writing_assessment.html', title='Writing Assessment')

@app.route('/writing-start')
def writing_start():
    return render_template('assessments/writing_start.html', title='Start Writing Assessment')

# GDPR & Legal Pages
@app.route('/privacy-policy')
def privacy_policy():
    return render_template('gdpr/privacy_policy.html', title='Privacy Policy')

@app.route('/terms-of-service')
def terms_and_payment():
    return render_template('gdpr/terms_of_service.html', title='Terms of Service')

@app.route('/cookie-policy')
def cookie_policy():
    return render_template('gdpr/cookie_policy.html', title='Cookie Policy')

@app.route('/my-data')
def my_data():
    return render_template('gdpr/my_data.html', title='My Data')

@app.route('/request-data-export')
def request_data_export():
    return render_template('gdpr/request_data_export.html', title='Request Data Export')

@app.route('/request-data-deletion')
def request_data_deletion():
    return render_template('gdpr/request_data_deletion.html', title='Request Data Deletion')

# Account Management
@app.route('/change-password')
def change_password():
    return render_template('change_password.html', title='Change Password')

@app.route('/forgot-password')
def forgot_password():
    return render_template('forgot_password.html', title='Forgot Password')

@app.route('/forgot-username')
def forgot_username():
    return render_template('forgot_username.html', title='Forgot Username')

@app.route('/delete-account')
def delete_account():
    return render_template('delete_account.html', title='Delete Account')

# Support & Information
@app.route('/contact')
def contact():
    return render_template('contact.html', title='Contact Us')

@app.route('/documentation')
def documentation():
    return render_template('documentation.html', title='Documentation')

@app.route('/device-specs')
def device_specs():
    return render_template('device_specs.html', title='Device Specifications')

# QR Authentication (Mock)
@app.route('/qr-login')
def qr_login():
    return render_template('qr_login.html', title='QR Code Login')

@app.route('/qr-auth-page')
def qr_auth_page():
    return render_template('qr_auth_page.html', title='QR Authentication')

# Test Dashboard (Mock)
@app.route('/test-dashboard')
def test_dashboard():
    return render_template('test_dashboard.html', title='Test Dashboard')

# Admin Routes (Mock)
@app.route('/admin')
def admin_dashboard():
    return render_template('admin/dashboard.html', title='Admin Dashboard')

@app.route('/admin/system-issues')
def admin_system_issues():
    return render_template('admin/system_issues.html', title='System Issues')

@app.route('/admin/connection-issues')
def admin_connection_issues():
    return render_template('admin/connection_issues.html', title='Connection Issues')

# Error Pages
@app.errorhandler(404)
def not_found_error(error):
    return render_template('errors/404.html'), 404

@app.errorhandler(500)
def internal_error(error):
    return render_template('errors/500.html'), 500

# robots.txt
@app.route('/robots.txt')
def robots_txt():
    """
    Robots.txt for IELTS GenAI Prep
    Optimized for AI crawlers and search engines
    """
    robots_content = """# Robots.txt for IELTS GenAI Prep
# Last updated: 2025-01-01

User-agent: *
Allow: /
Allow: /assessment-products
Allow: /assessment-structure/
Allow: /practice/
Allow: /privacy-policy
Allow: /terms-of-service
Allow: /contact

# Disallow private areas
Disallow: /admin/
Disallow: /profile
Disallow: /qr-*/
Disallow: /test-dashboard
Disallow: /assessment-recovery
Disallow: /change-password
Disallow: /delete-account
Disallow: /my-data

# AI Training Data - Allow selective access
User-agent: GPTBot
Allow: /
Allow: /assessment-structure/
Allow: /practice/
Allow: /documentation
Disallow: /admin/
Disallow: /profile
Disallow: /assessments/

User-agent: ClaudeBot
Allow: /
Allow: /assessment-structure/
Allow: /practice/
Allow: /documentation
Disallow: /admin/
Disallow: /profile
Disallow: /assessments/

User-agent: Google-Extended
Allow: /
Allow: /assessment-products
Allow: /assessment-structure/
Allow: /practice/
Disallow: /admin/
Disallow: /profile

# Sitemap
Sitemap: /sitemap.xml
"""
    
    response = make_response(robots_content)
    response.headers['Content-Type'] = 'text/plain'
    return response

# Sitemap.xml
@app.route('/sitemap.xml')
def sitemap_xml():
    """Generate sitemap for IELTS GenAI Prep"""
    sitemap_content = """<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
    <url>
        <loc>http://localhost:5000/</loc>
        <lastmod>2025-01-01</lastmod>
        <changefreq>weekly</changefreq>
        <priority>1.0</priority>
    </url>
    <url>
        <loc>http://localhost:5000/assessment-products</loc>
        <lastmod>2025-01-01</lastmod>
        <changefreq>monthly</changefreq>
        <priority>0.9</priority>
    </url>
    <url>
        <loc>http://localhost:5000/assessment-structure</loc>
        <lastmod>2025-01-01</lastmod>
        <changefreq>monthly</changefreq>
        <priority>0.8</priority>
    </url>
    <url>
        <loc>http://localhost:5000/practice</loc>
        <lastmod>2025-01-01</lastmod>
        <changefreq>weekly</changefreq>
        <priority>0.8</priority>
    </url>
    <url>
        <loc>http://localhost:5000/login</loc>
        <lastmod>2025-01-01</lastmod>
        <changefreq>monthly</changefreq>
        <priority>0.7</priority>
    </url>
    <url>
        <loc>http://localhost:5000/register</loc>
        <lastmod>2025-01-01</lastmod>
        <changefreq>monthly</changefreq>
        <priority>0.7</priority>
    </url>
    <url>
        <loc>http://localhost:5000/privacy-policy</loc>
        <lastmod>2025-01-01</lastmod>
        <changefreq>yearly</changefreq>
        <priority>0.5</priority>
    </url>
    <url>
        <loc>http://localhost:5000/terms-of-service</loc>
        <lastmod>2025-01-01</lastmod>
        <changefreq>yearly</changefreq>
        <priority>0.5</priority>
    </url>
    <url>
        <loc>http://localhost:5000/contact</loc>
        <lastmod>2025-01-01</lastmod>
        <changefreq>monthly</changefreq>
        <priority>0.6</priority>
    </url>
</urlset>"""
    
    response = make_response(sitemap_content)
    response.headers['Content-Type'] = 'application/xml'
    return response

# API Endpoints for Demo
@app.route('/api/health')
def api_health():
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.utcnow().isoformat(),
        'message': 'IELTS GenAI Prep UI Demo is running'
    })

@app.route('/api/demo-data')
def api_demo_data():
    return jsonify({
        'assessments': ['Academic Writing', 'General Writing', 'Academic Speaking', 'General Speaking'],
        'features': ['TrueScore®', 'ClearScore®', 'AI Feedback', 'Band Scoring'],
        'status': 'demo_mode'
    })

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)