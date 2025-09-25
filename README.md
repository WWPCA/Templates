# IELTS GenAI Prep - Current Preview Session Templates

This repository contains **ONLY** the templates and files currently being used in the active preview session.

## Active Templates

The following 6 templates are currently being served by the Lambda handler:

### 🏠 Core Pages
- **`working_template_backup_20250714_192410.html`** - Main home page template with full IELTS GenAI Prep branding
- **`mobile_registration_flow.html`** - Mobile user registration interface

### 🧪 Test & Demo Pages  
- **`test_mobile_home_screen.html`** - Mobile home screen testing interface
- **`test_maya_voice.html`** - Maya AI voice testing page
- **`database_schema_demo.html`** - Database schema demonstration
- **`nova_assessment_demo.html`** - Nova AI assessment demonstration

### 📱 Current Live Routes
Based on the active Lambda handler (`app.py`), these templates are served at:

- `/` → `working_template_backup_20250714_192410.html` (Home page)
- `/mobile-registration` → `mobile_registration_flow.html`
- `/test_mobile_home_screen.html` → `test_mobile_home_screen.html`
- `/test_maya_voice.html` → `test_maya_voice.html`
- `/database-schema` → `database_schema_demo.html`
- `/nova-assessment.html` → `nova_assessment_demo.html`

## Essential Files

- **`app.py`** - Main Lambda handler with routing logic
- **`robots.txt`** - SEO and search engine directives
- **`requirements.txt`** - Python dependencies (if needed)

## Quick Start

1. The application is designed to run as an AWS Lambda handler
2. In development mode, it can be tested locally using the Flask-compatible structure
3. All templates include responsive design with purple gradient branding

## Features in Current Preview

✅ **Active Features:**
- Home page with hero section and branding
- Mobile registration workflow
- Maya AI voice testing capability
- Nova AI assessment demos
- Database schema visualization
- Mobile-responsive design

❌ **Removed from this package:**
- 90+ unused template files
- Unused static assets
- Non-active page templates
- Legacy backup files

## Technical Notes

- This is a **minimal, focused package** containing only templates currently in use
- The Lambda handler generates most HTML content inline
- Static template files are used for specific test and demo pages
- All templates maintain TrueScore® and ClearScore® branding consistency

---

*This package reflects the exact state of the current preview session as of the cleanup operation.*