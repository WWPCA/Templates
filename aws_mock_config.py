"""
AWS Mock Services Configuration for .replit Environment
Simulates DynamoDB, ElastiCache, and CloudWatch for mobile-first authentication
"""

import os
import json
import time
import uuid
import random
import bcrypt
from datetime import datetime, timedelta
from typing import Dict, Any, Optional, List

class MockDynamoDBTable:
    """Simulates DynamoDB table with TTL support"""
    
    def __init__(self, table_name: str):
        self.table_name = table_name
        self.items = {}
        self.gsi_indexes = {}
    
    def put_item(self, item: Dict[str, Any]) -> bool:
        """Store item with automatic TTL cleanup"""
        # For users table, use email as key; for others, use their primary key
        if self.table_name == 'ielts-genai-prep-users':
            item_key = item.get('email')
        else:
            item_key = item.get('user_id', item.get('session_id', item.get('email')))
        
        if not item_key:
            return False
        
        # Add DynamoDB metadata
        item['_created_at'] = time.time()
        item['_table'] = self.table_name
        
        self.items[item_key] = item
        self._cleanup_expired_items()
        
        print(f"[DYNAMODB] PUT {self.table_name}: {item_key}")
        return True
    
    def get_item(self, key: str) -> Optional[Dict[str, Any]]:
        """Retrieve item if not expired"""
        self._cleanup_expired_items()
        item = self.items.get(key)
        
        if item:
            print(f"[DYNAMODB] GET {self.table_name}: {key} -> Found")
            return item
        else:
            print(f"[DYNAMODB] GET {self.table_name}: {key} -> Not Found")
            return None
    
    def delete_item(self, key: str) -> bool:
        """Delete item"""
        if key in self.items:
            del self.items[key]
            print(f"[DYNAMODB] DELETE {self.table_name}: {key}")
            return True
        return False
    
    def update_item(self, key: str, updates: Dict[str, Any]) -> bool:
        """Update existing item"""
        if key in self.items:
            self.items[key].update(updates)
            print(f"[DYNAMODB] UPDATE {self.table_name}: {key}")
            return True
        return False
    
    def scan(self, filter_expression: Optional[str] = None) -> list:
        """Scan table with optional filtering"""
        self._cleanup_expired_items()
        items = list(self.items.values())
        print(f"[DYNAMODB] SCAN {self.table_name}: {len(items)} items")
        return items
    
    def _cleanup_expired_items(self):
        """Remove items past their TTL"""
        current_time = time.time()
        expired_keys = []
        
        for key, item in self.items.items():
            ttl = item.get('ttl', item.get('expires_at'))
            if ttl and current_time > ttl:
                expired_keys.append(key)
        
        for key in expired_keys:
            del self.items[key]
            print(f"[DYNAMODB] TTL_EXPIRED {self.table_name}: {key}")

class MockElastiCache:
    """Simulates ElastiCache Redis for session storage"""
    
    def __init__(self):
        self.cache = {}
        self.expirations = {}
    
    def set(self, key: str, value: Any, ex: int = 3600) -> bool:
        """Set key with expiration"""
        self.cache[key] = value
        self.expirations[key] = time.time() + ex
        print(f"[ELASTICACHE] SET {key} (expires in {ex}s)")
        return True
    
    def get(self, key: str) -> Optional[Any]:
        """Get key if not expired"""
        self._cleanup_expired()
        value = self.cache.get(key)
        
        if value:
            print(f"[ELASTICACHE] GET {key} -> Found")
            return value
        else:
            print(f"[ELASTICACHE] GET {key} -> Not Found")
            return None
    
    def delete(self, key: str) -> bool:
        """Delete key"""
        if key in self.cache:
            del self.cache[key]
            if key in self.expirations:
                del self.expirations[key]
            print(f"[ELASTICACHE] DELETE {key}")
            return True
        return False
    
    def exists(self, key: str) -> bool:
        """Check if key exists and not expired"""
        self._cleanup_expired()
        exists = key in self.cache
        print(f"[ELASTICACHE] EXISTS {key} -> {exists}")
        return exists
    
    def ttl(self, key: str) -> int:
        """Get time to live for key"""
        if key not in self.expirations:
            return -1
        
        remaining = int(self.expirations[key] - time.time())
        return max(0, remaining)
    
    def _cleanup_expired(self):
        """Remove expired keys"""
        current_time = time.time()
        expired_keys = []
        
        for key, expiry in self.expirations.items():
            if current_time > expiry:
                expired_keys.append(key)
        
        for key in expired_keys:
            if key in self.cache:
                del self.cache[key]
            del self.expirations[key]
            print(f"[ELASTICACHE] EXPIRED {key}")

class MockCloudWatch:
    """Simulates CloudWatch logging and metrics"""
    
    def __init__(self):
        self.log_groups = {}
        self.metrics = []
    
    def put_log_events(self, log_group: str, log_stream: str, events: list):
        """Store log events"""
        if log_group not in self.log_groups:
            self.log_groups[log_group] = {}
        
        if log_stream not in self.log_groups[log_group]:
            self.log_groups[log_group][log_stream] = []
        
        for event in events:
            log_entry = {
                'timestamp': event.get('timestamp', int(time.time() * 1000)),
                'message': event.get('message', ''),
                'ingestionTime': int(time.time() * 1000)
            }
            self.log_groups[log_group][log_stream].append(log_entry)
        
        print(f"[CLOUDWATCH] LOGS {log_group}/{log_stream}: {len(events)} events")
    
    def put_metric_data(self, namespace: str, metric_data: list):
        """Store metrics"""
        for metric in metric_data:
            metric_entry = {
                'namespace': namespace,
                'metric_name': metric.get('MetricName'),
                'value': metric.get('Value'),
                'unit': metric.get('Unit', 'Count'),
                'timestamp': metric.get('Timestamp', datetime.utcnow()),
                'dimensions': metric.get('Dimensions', [])
            }
            self.metrics.append(metric_entry)
        
        print(f"[CLOUDWATCH] METRICS {namespace}: {len(metric_data)} metrics")
    
    def get_recent_logs(self, log_group: str, limit: int = 100) -> list:
        """Get recent log entries"""
        if log_group not in self.log_groups:
            return []
        
        all_logs = []
        for stream_logs in self.log_groups[log_group].values():
            all_logs.extend(stream_logs)
        
        # Sort by timestamp and return most recent
        all_logs.sort(key=lambda x: x['timestamp'], reverse=True)
        return all_logs[:limit]

class AWSMockServices:
    """Central configuration for all AWS mock services"""
    
    def __init__(self):
        # DynamoDB Tables
        self.users_table = MockDynamoDBTable('ielts-genai-prep-users')
        self.assessment_results_table = MockDynamoDBTable('ielts-genai-prep-assessment-results')
        self.assessment_rubrics_table = MockDynamoDBTable('ielts-genai-prep-assessment-rubrics')
        
        # GDPR Compliance Tables
        self.gdpr_consents_table = MockDynamoDBTable('ielts-genai-prep-gdpr-consents')
        self.gdpr_data_requests_table = MockDynamoDBTable('ielts-genai-prep-gdpr-data-requests')
        self.gdpr_cookie_preferences_table = MockDynamoDBTable('ielts-genai-prep-cookie-preferences')
        
        # ElastiCache
        self.session_cache = MockElastiCache()
        
        # CloudWatch
        self.cloudwatch = MockCloudWatch()
        
        # Environment simulation
        self.region = os.environ.get('AWS_REGION', 'us-east-1')
        self.account_id = '123456789012'  # Mock account ID
        
        # Initialize IELTS assessment rubrics
        self._setup_assessment_data()
        
        print(f"[AWS_MOCK] Services initialized for region: {self.region}")
        print(f"[AWS_MOCK] GDPR compliance tables initialized")
        
        # Create test user for development
        self._create_test_user()
    
    def _setup_assessment_data(self):
        """Initialize IELTS assessment rubrics for Nova Sonic and Nova Micro"""
        
        # IELTS Speaking Assessment Rubrics (for Nova Sonic)
        speaking_rubrics = {
            'academic_speaking': {
                'rubric_id': 'ielts_academic_speaking_v2024',
                'assessment_type': 'speaking',
                'criteria': {
                    'fluency_and_coherence': {
                        'band_9': 'Speaks fluently with only rare repetition or self-correction. Develops topics coherently and appropriately.',
                        'band_8': 'Speaks fluently with only occasional repetition or self-correction. Develops topics coherently.',
                        'band_7': 'Speaks at length without noticeable effort or loss of coherence. Uses linking words effectively.',
                        'band_6': 'Speaks at length though may show hesitation. Generally coherent but may lack progression.',
                        'band_5': 'Usually maintains flow but uses repetition and hesitation. Over-uses linking words.',
                        'band_4': 'Cannot respond without noticeable pauses. Speech may be slow with frequent repetition.',
                        'descriptors': ['flow', 'pace', 'coherence', 'topic_development', 'linking_devices']
                    },
                    'lexical_resource': {
                        'band_9': 'Uses vocabulary with full flexibility and precise usage in all topics.',
                        'band_8': 'Uses wide range of vocabulary fluently and flexibly to convey precise meanings.',
                        'band_7': 'Uses vocabulary resource flexibly to discuss variety of topics.',
                        'band_6': 'Has wide enough vocabulary to discuss topics at length.',
                        'band_5': 'Manages to talk about familiar topics but uses vocabulary inappropriately.',
                        'band_4': 'Limited vocabulary prevents discussion of unfamiliar topics.',
                        'descriptors': ['range', 'accuracy', 'flexibility', 'appropriacy', 'paraphrase_ability']
                    },
                    'grammatical_range_and_accuracy': {
                        'band_9': 'Uses wide range of structures with full flexibility and accuracy.',
                        'band_8': 'Uses wide range of structures flexibly with majority error-free.',
                        'band_7': 'Uses range of complex structures with some flexibility.',
                        'band_6': 'Uses mix of simple and complex structures with some errors.',
                        'band_5': 'Uses basic sentence forms with reasonable accuracy.',
                        'band_4': 'Uses only basic sentence forms with frequent errors.',
                        'descriptors': ['complexity', 'range', 'accuracy', 'error_frequency', 'communication_impact']
                    },
                    'pronunciation': {
                        'band_9': 'Uses wide range of pronunciation features with precise control.',
                        'band_8': 'Uses wide range of pronunciation features flexibly.',
                        'band_7': 'Shows all positive features and sustained ability.',
                        'band_6': 'Uses range of pronunciation features with mixed control.',
                        'band_5': 'Shows some effective use of features but not sustained.',
                        'band_4': 'Limited range of pronunciation features.',
                        'descriptors': ['individual_sounds', 'word_stress', 'sentence_stress', 'intonation', 'chunking']
                    }
                },
                'nova_sonic_prompts': {
                    'system_prompt': 'You are Maya, an experienced IELTS examiner conducting a speaking assessment. Follow IELTS speaking test format with Part 1 (familiar topics), Part 2 (long turn), and Part 3 (abstract discussion). Evaluate based on fluency, vocabulary, grammar, and pronunciation.',
                    'part_1_topics': ['work', 'studies', 'hometown', 'family', 'hobbies', 'food', 'transport', 'weather'],
                    'part_2_structure': 'Give candidate cue card with topic, 1 minute preparation, 2 minutes speaking',
                    'part_3_approach': 'Ask abstract questions related to Part 2 topic, probe deeper understanding'
                }
            },
            'general_speaking': {
                'rubric_id': 'ielts_general_speaking_v2024',
                'assessment_type': 'speaking',
                'criteria': {
                    # Same criteria as academic but with different topics and contexts
                    'fluency_and_coherence': {
                        'band_9': 'Speaks fluently with only rare repetition or self-correction. Develops topics coherently and appropriately.',
                        'band_8': 'Speaks fluently with only occasional repetition or self-correction. Develops topics coherently.',
                        'band_7': 'Speaks at length without noticeable effort or loss of coherence. Uses linking words effectively.',
                        'band_6': 'Speaks at length though may show hesitation. Generally coherent but may lack progression.',
                        'band_5': 'Usually maintains flow but uses repetition and hesitation. Over-uses linking words.',
                        'band_4': 'Cannot respond without noticeable pauses. Speech may be slow with frequent repetition.',
                        'descriptors': ['flow', 'pace', 'coherence', 'topic_development', 'linking_devices']
                    }
                },
                'nova_sonic_prompts': {
                    'system_prompt': 'You are Maya, an IELTS examiner for General Training. Focus on everyday situations, practical English usage, and social contexts.',
                    'part_1_topics': ['daily_routine', 'shopping', 'travel', 'entertainment', 'sports', 'technology'],
                    'part_2_structure': 'Practical topics like describing experiences, places, people',
                    'part_3_approach': 'Discuss practical implications and everyday applications'
                }
            }
        }
        
        # IELTS Writing Assessment Rubrics (for Nova Micro)
        writing_rubrics = {
            'academic_writing': {
                'rubric_id': 'ielts_academic_writing_v2024',
                'assessment_type': 'writing',
                'task_1': {
                    'task_achievement': {
                        'band_9': 'Fully satisfies all requirements. Clearly presents fully developed response.',
                        'band_8': 'Covers requirements sufficiently. Clearly presents well-developed response.',
                        'band_7': 'Covers requirements. Clearly presents key features/bullet points.',
                        'band_6': 'Addresses requirements with some omissions. Format appropriate.',
                        'band_5': 'Generally addresses requirements. Format may be inappropriate.',
                        'band_4': 'Attempts to address requirements but fails to cover all.',
                        'descriptors': ['completeness', 'appropriacy', 'accuracy', 'overview', 'key_features']
                    }
                },
                'task_2': {
                    'task_response': {
                        'band_9': 'Fully addresses all parts. Develops clear, comprehensive arguments.',
                        'band_8': 'Sufficiently addresses all parts. Develops relevant arguments.',
                        'band_7': 'Addresses all parts though some more than others.',
                        'band_6': 'Addresses all parts but some may be more developed.',
                        'band_5': 'Addresses the task only partially. Limited development.',
                        'band_4': 'Responds to task but in limited way.',
                        'descriptors': ['position_clarity', 'argument_development', 'examples', 'conclusion']
                    }
                },
                'nova_micro_prompts': {
                    'system_prompt': 'You are an IELTS Academic Writing examiner. Evaluate Task Achievement/Response, Coherence and Cohesion, Lexical Resource, and Grammatical Range and Accuracy. Provide band scores (1-9) and detailed feedback.',
                    'task_1_requirements': 'Describe visual information (graphs, charts, diagrams). Minimum 150 words. Academic tone.',
                    'task_2_requirements': 'Present argument or discussion. Minimum 250 words. Academic essay structure.'
                }
            }
        }
        
        # Store rubrics in database
        for speaking_type, rubric in speaking_rubrics.items():
            self.assessment_rubrics_table.put_item(rubric)
            
        for writing_type, rubric in writing_rubrics.items():
            self.assessment_rubrics_table.put_item(rubric)
            
        print("[AWS_MOCK] IELTS assessment rubrics initialized")
    
    def _create_test_user(self):
        """Create test user for development and testing"""
        test_user_data = {
            'email': 'test@ieltsgenaiprep.com',
            'password': 'testpassword123'
        }
        
        if self.create_user(test_user_data):
            # Add test purchases for all assessment types
            user = self.users_table.get_item('test@ieltsgenaiprep.com')
            if user:
                test_purchases = [
                    {'product_id': 'academic-writing', 'platform': 'mobile'},
                    {'product_id': 'academic-speaking', 'platform': 'mobile'},
                    {'product_id': 'general-writing', 'platform': 'mobile'},
                    {'product_id': 'general-speaking', 'platform': 'mobile'}
                ]
                
                for purchase in test_purchases:
                    self.add_user_purchase(user['user_id'], purchase)
                
                print("[AWS_MOCK] Test user created: test@ieltsgenaiprep.com / testpassword123")
    
    def create_user(self, user_data: Dict[str, Any]) -> bool:
        """Create new user with bcrypt password hashing"""
        email = user_data.get('email')
        password = user_data.get('password')
        
        if not email or not password:
            return False
        
        # Hash password with bcrypt
        password_hash = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())
        
        user_record = {
            'user_id': str(uuid.uuid4()),
            'email': email,
            'password_hash': password_hash.decode('utf-8'),
            'created_at': datetime.utcnow().isoformat(),
            'purchases': [],
            'last_login': None
        }
        
        return self.users_table.put_item(user_record)
    
    def verify_credentials(self, email: str, password: str) -> Optional[Dict[str, Any]]:
        """Verify user credentials and return user data"""
        user = self.users_table.get_item(email)
        
        if not user:
            return None
        
        # Verify password with bcrypt
        if bcrypt.checkpw(password.encode('utf-8'), user['password_hash'].encode('utf-8')):
            # Update last login
            user['last_login'] = datetime.utcnow().isoformat()
            self.users_table.put_item(user)
            return user
        
        return None
    
    def create_session(self, session_data: Dict[str, Any]) -> bool:
        """Create session in ElastiCache"""
        session_id = session_data['session_id']
        return self.session_cache.set(session_id, session_data, ex=3600)
    
    def get_session(self, session_id: str) -> Optional[Dict[str, Any]]:
        """Get session from ElastiCache"""
        return self.session_cache.get(session_id)
    
    def log_event(self, log_group: str, message: str, level: str = 'INFO'):
        """Log event to CloudWatch"""
        self.cloudwatch.put_log_events(log_group, 'lambda-stream', [{
            'timestamp': int(time.time() * 1000),
            'message': f"[{level}] {message}"
        }])
    
    def record_metric(self, metric_name: str, value: float, unit: str = 'Count'):
        """Record metric to CloudWatch"""
        self.cloudwatch.put_metric_data('IELTS/GenAI/Prep', [{
            'MetricName': metric_name,
            'Value': value,
            'Unit': unit,
            'Timestamp': datetime.utcnow()
        }])
    
    def get_assessment_rubric(self, assessment_type: str) -> Optional[Dict[str, Any]]:
        """Get IELTS assessment rubric from DynamoDB for Nova Sonic/Micro"""
        return self.assessment_rubrics_table.get_item(assessment_type)
    
    def store_assessment_result(self, result_data: Dict[str, Any]) -> bool:
        """Store assessment result in DynamoDB"""
        return self.assessment_results_table.put_item(result_data)
    
    def get_user_assessments(self, user_email: str) -> Dict[str, Dict[str, Any]]:
        """Get user's purchased assessments with attempt counts"""
        user = self.users_table.get_item(user_email)
        if not user or 'purchases' not in user:
            # Return default assessments for testing
            return {
                'academic_writing': {'attempts_left': 4, 'total_attempts': 4},
                'general_writing': {'attempts_left': 4, 'total_attempts': 4},
                'academic_speaking': {'attempts_left': 4, 'total_attempts': 4},
                'general_speaking': {'attempts_left': 4, 'total_attempts': 4}
            }
        
        assessment_data = {}
        for purchase in user['purchases']:
            assessment_type = purchase.get('assessment_type')
            if assessment_type:
                assessment_data[assessment_type] = {
                    'attempts_left': purchase.get('assessments_remaining', 4),
                    'total_attempts': 4,
                    'purchase_date': purchase.get('purchase_date', ''),
                    'last_used': purchase.get('last_used', ''),
                    'price': purchase.get('price', 49.99)
                }
        
        return assessment_data
    
    def get_assessment_history(self, user_email: str) -> list:
        """Get assessment history for a user from DynamoDB"""
        results = self.assessment_results_table.scan(f"user_email = '{user_email}'")
        
        if not results:
            # Return mock assessment history for testing
            return [
                {
                    'assessment_id': f'test_assessment_{int(time.time())}',
                    'assessment_type': 'academic-writing',
                    'timestamp': datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S'),
                    'overall_band': 7.5,
                    'completed': True,
                    'user_email': user_email
                },
                {
                    'assessment_id': f'test_assessment_{int(time.time())-3600}',
                    'assessment_type': 'general-speaking',
                    'timestamp': (datetime.utcnow() - timedelta(hours=1)).strftime('%Y-%m-%d %H:%M:%S'),
                    'overall_band': 8.0,
                    'completed': True,
                    'user_email': user_email
                }
            ]
        
        return results
    
    def get_user_profile(self, user_email: str) -> Dict[str, Any]:
        """Get user profile information"""
        user = self.users_table.get_item(user_email)
        if not user:
            # Return basic profile for testing
            return {
                'email': user_email,
                'created_at': datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S'),
                'last_login': datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S'),
                'total_attempts': 0,
                'completed_assessments': 0,
                'account_status': 'active'
            }
        
        # Calculate statistics
        total_attempts = 0
        completed_assessments = 0
        
        if 'purchases' in user:
            for purchase in user['purchases']:
                total_attempts += purchase.get('assessments_used', 0)
                if purchase.get('assessments_used', 0) > 0:
                    completed_assessments += 1
        
        return {
            'email': user_email,
            'created_at': user.get('created_at', 'Unknown'),
            'last_login': user.get('last_login', 'Unknown'),
            'total_attempts': total_attempts,
            'completed_assessments': completed_assessments,
            'account_status': 'active',
            'username': user.get('username', user_email.split('@')[0])
        }
    
    def delete_user_completely(self, user_email: str) -> bool:
        """Delete all user data across all tables (GDPR compliance)"""
        try:
            # Delete from users table
            self.users_table.delete_item(user_email)
            
            # Delete from assessment results table
            user_assessments = self.assessment_results_table.scan(f"user_email = '{user_email}'")
            for assessment in user_assessments:
                assessment_id = assessment.get('assessment_id')
                if assessment_id:
                    self.assessment_results_table.delete_item(assessment_id)
            
            # Delete from auth tokens table
            tokens = self.auth_tokens_table.scan(f"user_email = '{user_email}'")
            for token in tokens:
                token_id = token.get('token_id')
                if token_id:
                    self.auth_tokens_table.delete_item(token_id)
            
            # Delete from GDPR tables
            self.gdpr_consent_table.delete_item(user_email)
            self.gdpr_requests_table.delete_item(user_email)
            
            # Clear from session cache
            sessions_to_delete = []
            for session_id, session_data in self.session_cache.items():
                if session_data.get('user_email') == user_email:
                    sessions_to_delete.append(session_id)
            
            for session_id in sessions_to_delete:
                del self.session_cache[session_id]
            
            print(f"[GDPR_DELETION] All data deleted for user: {user_email}")
            return True
            
        except Exception as e:
            print(f"[ERROR] Failed to delete user data: {str(e)}")
            return False
    
    def add_user_purchase(self, user_id: str, purchase_data: Dict[str, Any]) -> bool:
        """Add purchase to user record with 4 assessment attempts"""
        user = self.users_table.get_item(user_id)
        if not user:
            return False
        
        # Map product IDs to assessment types
        product_assessment_map = {
            'com.ieltsgenaiprep.academic.writing': 'academic_writing',
            'com.ieltsgenaiprep.general.writing': 'general_writing',
            'com.ieltsgenaiprep.academic.speaking': 'academic_speaking',
            'com.ieltsgenaiprep.general.speaking': 'general_speaking',
            'academic_writing_assessment': 'academic_writing',
            'general_writing_assessment': 'general_writing',
            'academic_speaking_assessment': 'academic_speaking',
            'general_speaking_assessment': 'general_speaking'
        }
        
        assessment_type = product_assessment_map.get(purchase_data.get('product_id'))
        if not assessment_type:
            return False
        
        purchase_record = {
            'product_id': purchase_data.get('product_id'),
            'assessment_type': assessment_type,
            'purchase_date': datetime.utcnow().isoformat(),
            'platform': purchase_data.get('platform', 'mobile'),
            'receipt_data': purchase_data.get('receipt_data'),
            'assessments_remaining': 4,
            'assessments_used': 0,
            'price': 49.99,
            'currency': 'USD'
        }
        
        user['purchases'].append(purchase_record)
        return self.users_table.put_item(user)

    def use_assessment_attempt(self, user_email: str, assessment_type: str) -> bool:
        """Decrement assessment counter when user completes an assessment"""
        user = self.users_table.get_item(user_email)
        if not user or 'purchases' not in user:
            return False
        
        # Find the purchase for this assessment type
        for purchase in user['purchases']:
            if purchase.get('assessment_type') == assessment_type:
                if purchase.get('assessments_remaining', 0) > 0:
                    purchase['assessments_remaining'] -= 1
                    purchase['assessments_used'] = purchase.get('assessments_used', 0) + 1
                    purchase['last_used'] = datetime.utcnow().isoformat()
                    
                    # Update user record
                    self.users_table.put_item(user)
                    
                    self.log_event('AssessmentUsage', f'Assessment used: {user_email} - {assessment_type}, {purchase["assessments_remaining"]} remaining')
                    return True
        
        return False

    def get_user_assessment_counts(self, user_email: str) -> Dict[str, Dict[str, int]]:
        """Get remaining and used assessment counts for user"""
        user = self.users_table.get_item(user_email)
        if not user or 'purchases' not in user:
            return {}
        
        assessment_counts = {}
        for purchase in user['purchases']:
            assessment_type = purchase.get('assessment_type')
            if assessment_type:
                assessment_counts[assessment_type] = {
                    'remaining': purchase.get('assessments_remaining', 0),
                    'used': purchase.get('assessments_used', 0),
                    'total': 4,
                    'purchased_at': purchase.get('purchase_date', ''),
                    'last_used': purchase.get('last_used', ''),
                    'price': purchase.get('price', 49.99)
                }
        
        return assessment_counts

    def has_assessment_access(self, user_email: str, assessment_type: str) -> bool:
        """Check if user has remaining assessments for this type"""
        counts = self.get_user_assessment_counts(user_email)
        return counts.get(assessment_type, {}).get('remaining', 0) > 0

    def get_unique_assessment_question(self, user_email: str, assessment_type: str) -> Optional[Dict[str, Any]]:
        """Get a unique assessment question that user hasn't seen before"""
        user = self.users_table.get_item(user_email)
        if not user:
            return None
        
        # Get user's completed assessments to avoid repetition
        completed_assessments = user.get('completed_assessments', [])
        used_questions = [a.get('question_id') for a in completed_assessments if a.get('assessment_type') == assessment_type]
        
        # Get question bank for this assessment type
        question_bank = self._get_question_bank(assessment_type)
        available_questions = [q for q in question_bank if q['question_id'] not in used_questions]
        
        if not available_questions:
            # If all questions used, allow reuse after completing all 4 attempts
            available_questions = question_bank
        
        # Return random question from available pool
        return random.choice(available_questions) if available_questions else None

    def _get_question_bank(self, assessment_type: str) -> List[Dict[str, Any]]:
        """Get comprehensive question bank for assessment type - Full Migration Complete"""
        question_banks = {
            'academic_writing': [
                {
                    'question_id': 'aw_task2_001',
                    'task': 'Task 2',
                    'prompt': 'Some people believe that universities should require every student to take a variety of courses outside their field of study. Others believe that universities should not force students to take any courses other than those that will help prepare them for jobs in their chosen fields. Write a response in which you discuss which view more closely aligns with your own position and explain your reasoning for the position you take.',
                    'word_limit': 250,
                    'time_limit': 40
                },
                {
                    'question_id': 'aw_task2_002', 
                    'task': 'Task 2',
                    'prompt': 'Many governments think that economic progress is their most important goal. Some people, however, think that other types of progress are equally important for a country. Discuss both these views and give your own opinion.',
                    'word_limit': 250,
                    'time_limit': 40
                },
                {
                    'question_id': 'aw_task2_003',
                    'task': 'Task 2', 
                    'prompt': 'In some countries, young people are encouraged to work or travel for a year between finishing high school and starting university studies. Discuss the advantages and disadvantages for young people who decide to do this.',
                    'word_limit': 250,
                    'time_limit': 40
                },
                {
                    'question_id': 'aw_task2_004',
                    'task': 'Task 2',
                    'prompt': 'Some people say that the main environmental problem of our time is the loss of particular species of plants and animals. Others say that there are more important environmental problems. Discuss both these views and give your own opinion.',
                    'word_limit': 250,
                    'time_limit': 40
                },
                {
                    'question_id': 'aw_task2_005',
                    'task': 'Task 2',
                    'prompt': 'In a number of countries, some people think it is necessary to spend large sums of money on constructing new railway lines for very fast trains between cities. Others believe the money should be spent on improving existing public transport. Discuss both these views and give your own opinion.',
                    'word_limit': 250,
                    'time_limit': 40
                },
                # Additional comprehensive questions from Academic Writing database
                {
                    'question_id': 'aw_task2_006',
                    'task': 'Task 2',
                    'prompt': 'The global economy is evolving quickly, and individuals can no longer rely on the same career path or workplace environment throughout their lives. Discuss the potential reasons for this rapid evolution, and propose strategies to prepare people for their careers in the future.',
                    'word_limit': 250,
                    'time_limit': 40
                },
                {
                    'question_id': 'aw_task2_007',
                    'task': 'Task 2',
                    'prompt': 'Many countries are experiencing a significant increase in the proportion of older people in their populations. Discuss the possible reasons for this demographic shift, and suggest ways in which societies can adapt to this aging population.',
                    'word_limit': 250,
                    'time_limit': 40
                },
                {
                    'question_id': 'aw_task2_008',
                    'task': 'Task 2',
                    'prompt': 'In many parts of the world, the popularity of private vehicles is increasing despite growing concerns about environmental pollution and traffic congestion. Discuss the possible reasons for the continued preference for private vehicles, and suggest ways in which governments could encourage people to use alternative forms of transport.',
                    'word_limit': 250,
                    'time_limit': 40
                },
                {
                    'question_id': 'aw_task2_009',
                    'task': 'Task 2',
                    'prompt': 'The increasing availability and influence of social media have fundamentally changed the way people communicate and form relationships. Discuss the potential benefits and drawbacks of this development, and suggest ways individuals and societies can navigate the impact of social media in the future.',
                    'word_limit': 250,
                    'time_limit': 40
                },
                {
                    'question_id': 'aw_task2_010',
                    'task': 'Task 2',
                    'prompt': 'Many cities around the world are experiencing increasing pressure from tourism, which can have both positive and negative effects on local communities and environments. Discuss the potential benefits and drawbacks of mass tourism in urban areas, and suggest ways in which cities can manage tourism more sustainably in the future.',
                    'word_limit': 250,
                    'time_limit': 40
                },
                {
                    'question_id': 'aw_task2_011',
                    'task': 'Task 2',
                    'prompt': 'The reliance on standardized testing as the primary method for evaluating student performance and determining educational opportunities is a subject of ongoing debate. Discuss the potential advantages and disadvantages of standardized testing in education, and suggest alternative methods that could be used to assess student learning and potential.',
                    'word_limit': 250,
                    'time_limit': 40
                },
                {
                    'question_id': 'aw_task2_012',
                    'task': 'Task 2',
                    'prompt': 'The increasing consumption of fast food and processed meals is a growing trend in many developed nations. Discuss the possible reasons for the popularity of these types of food, and suggest ways in which individuals and governments could encourage healthier eating habits.',
                    'word_limit': 250,
                    'time_limit': 40
                }
            ],
            'general_writing': [
                {
                    'question_id': 'gw_task1_001',
                    'task': 'Task 1',
                    'prompt': 'You recently bought a piece of equipment for your kitchen but it did not work. You phoned the shop but no action was taken. Write a letter to the shop manager. In your letter: describe the problem with the equipment, explain what happened when you phoned the shop, say what you would like the manager to do.',
                    'word_limit': 150,
                    'time_limit': 20
                },
                {
                    'question_id': 'gw_task1_002',
                    'task': 'Task 1', 
                    'prompt': 'You work for an international company, and would like to spend six months working in its head office in another country. Write a letter to your manager. In your letter: explain why you want to work in the company\'s head office for six months, say how your work could be done while you are away, ask for his/her help in arranging it.',
                    'word_limit': 150,
                    'time_limit': 20
                },
                {
                    'question_id': 'gw_task1_003',
                    'task': 'Task 1',
                    'prompt': 'A friend has agreed to look after your house and pet while you are on holiday. Write a letter to your friend. In your letter: give contact details for when you are away, give instructions about how to care for your pet, describe other household duties.',
                    'word_limit': 150,
                    'time_limit': 20
                },
                {
                    'question_id': 'gw_task1_004',
                    'task': 'Task 1',
                    'prompt': 'You have seen an advertisement in an Australian magazine for someone to live with a family for six months and look after their six-year-old child. Write a letter to the parents. In your letter: explain why you would like the job, give details of why you would be a suitable person to employ, say how you would spend your free time while you are in Australia.',
                    'word_limit': 150,
                    'time_limit': 20
                },
                {
                    'question_id': 'gw_task1_005',
                    'task': 'Task 1',
                    'prompt': 'You are going to another country to study. You would like to do a part-time job while you are studying, so you want to ask a friend who lives there for some help. Write a letter to your friend. In your letter: give details about your study plans, explain why you want to get a part-time job, suggest how your friend could help you find a job.',
                    'word_limit': 150,
                    'time_limit': 20
                },
                # Additional comprehensive questions from General Writing database - Task 2 Essays
                {
                    'question_id': 'gw_task2_006',
                    'task': 'Task 2',
                    'prompt': 'Urban areas face increasing traffic problems. Some think building more roads is the answer, while others favor improving public transport. Who do you believe should be the priority: expanding roads or developing public transport?',
                    'word_limit': 250,
                    'time_limit': 40
                },
                {
                    'question_id': 'gw_task2_007',
                    'task': 'Task 2',
                    'prompt': 'Many companies are now allowing their employees to work from home some or all of the time. This shift has both benefits and drawbacks. Do you think the advantages of remote work outweigh the disadvantages, or vice versa?',
                    'word_limit': 250,
                    'time_limit': 40
                },
                {
                    'question_id': 'gw_task2_008',
                    'task': 'Task 2',
                    'prompt': 'The use of social media has become widespread among young people. It offers opportunities for connection but also presents potential risks. Do you believe the benefits of social media for young people outweigh the risks, or are the risks more significant?',
                    'word_limit': 250,
                    'time_limit': 40
                },
                {
                    'question_id': 'gw_task2_009',
                    'task': 'Task 2',
                    'prompt': 'Fast food is a popular choice for many due to its convenience and affordability. However, its impact on health is often debated. Do you think the advantages of fast food outweigh its disadvantages, or are the health concerns more significant?',
                    'word_limit': 250,
                    'time_limit': 40
                },
                # Additional Task 1 Letters from database files
                {
                    'question_id': 'gw_task1_006',
                    'task': 'Task 1',
                    'prompt': 'You are currently enrolled in an evening course at a local community center, but you are facing several issues with the classroom environment that make it challenging to focus and learn effectively. Write a letter to the course coordinator at the community center. In your letter: describe the situation, explain your problems and why it is difficult to learn, suggest what kind of classroom environment you would prefer.',
                    'word_limit': 150,
                    'time_limit': 20
                },
                {
                    'question_id': 'gw_task1_007',
                    'task': 'Task 1',
                    'prompt': 'You have recently joined a local gym to improve your fitness, but you are experiencing several issues with the gym facilities that make it difficult to exercise comfortably. Write a letter to the gym manager. In your letter: describe the situation, explain your problems and why it is difficult to exercise, suggest what kind of improvements or facilities you would prefer.',
                    'word_limit': 150,
                    'time_limit': 20
                }
            ],
            'academic_speaking': [
                {
                    'question_id': 'as_complete_001',
                    'assessment_type': 'academic_speaking',
                    'parts': [
                        {
                            'part': 1,
                            'duration': '4-5 minutes',
                            'topic': 'Introduction and Interview',
                            'questions': [
                                'Tell me about your favorite hobby and why you enjoy it.',
                                'Tell me about your job. What responsibilities do you have?'
                            ]
                        },
                        {
                            'part': 2,
                            'duration': '3-4 minutes',
                            'topic': 'Individual Long Turn',
                            'prompt': 'Describe a place you have visited that had a significant impact on you. You should say: where the place is, when you went there, what you did there, and explain why this place had such an impact on you.',
                            'prep_time': 60,
                            'talk_time': 120
                        },
                        {
                            'part': 3,
                            'duration': '4-5 minutes',
                            'topic': 'Two-way Discussion',
                            'questions': [
                                'Do you think travel is an important part of education? Why or why not?',
                                'What changes do you think will happen in education in the future?'
                            ]
                        }
                    ],
                    'total_duration': '11-14 minutes'
                },
                {
                    'question_id': 'as_complete_002',
                    'assessment_type': 'academic_speaking',
                    'parts': [
                        {
                            'part': 1,
                            'duration': '4-5 minutes',
                            'topic': 'Introduction and Interview',
                            'questions': [
                                'What do you like or dislike about your studies?',
                                'Would you prefer to work in a large company or a small company? Why?'
                            ]
                        },
                        {
                            'part': 2,
                            'duration': '3-4 minutes',
                            'topic': 'Individual Long Turn',
                            'prompt': 'Describe a person who has had a significant influence on your life. You should say: who this person is, how you know them, what they do, and explain why they have influenced you so much.',
                            'prep_time': 60,
                            'talk_time': 120
                        },
                        {
                            'part': 3,
                            'duration': '4-5 minutes',
                            'topic': 'Two-way Discussion',
                            'questions': [
                                'Do you think students should be able to choose what they study at school?',
                                'How important do you think it is for people to continue learning throughout their lives?'
                            ]
                        }
                    ],
                    'total_duration': '11-14 minutes'
                },
                {
                    'question_id': 'as_complete_003',
                    'assessment_type': 'academic_speaking',
                    'parts': [
                        {
                            'part': 1,
                            'duration': '4-5 minutes',
                            'topic': 'Introduction and Interview',
                            'questions': [
                                'Can you describe the place where you live?',
                                'What kind of accommodation do you live in?'
                            ]
                        },
                        {
                            'part': 2,
                            'duration': '3-4 minutes',
                            'topic': 'Individual Long Turn',
                            'prompt': 'Describe a teacher who has influenced you. You should say: when you met them, what subject they taught, what was special about them, and explain how they influenced your life.',
                            'prep_time': 60,
                            'talk_time': 120
                        },
                        {
                            'part': 3,
                            'duration': '4-5 minutes',
                            'topic': 'Two-way Discussion',
                            'questions': [
                                'What factors should people consider when choosing a career?',
                                'Do you think it\'s better to have one job for life or to change jobs regularly?'
                            ]
                        }
                    ],
                    'total_duration': '11-14 minutes'
                },
                {
                    'question_id': 'as_complete_004',
                    'assessment_type': 'academic_speaking',
                    'parts': [
                        {
                            'part': 1,
                            'duration': '4-5 minutes',
                            'topic': 'Introduction and Interview',
                            'questions': [
                                'What changes would you like to make to your home?',
                                'Describe your hometown. What is it known for?'
                            ]
                        },
                        {
                            'part': 2,
                            'duration': '3-4 minutes',
                            'topic': 'Individual Long Turn',
                            'prompt': 'Describe a friend who is a good leader. You should say: who the person is, how you know this person, what leadership qualities they have, and explain why you think they are a good leader.',
                            'prep_time': 60,
                            'talk_time': 120
                        },
                        {
                            'part': 3,
                            'duration': '4-5 minutes',
                            'topic': 'Two-way Discussion',
                            'questions': [
                                'How has technology changed the way people work in your country?',
                                'What environmental problems does your country face today?'
                            ]
                        }
                    ],
                    'total_duration': '11-14 minutes'
                },
                {
                    'question_id': 'as_complete_005',
                    'assessment_type': 'academic_speaking',
                    'parts': [
                        {
                            'part': 1,
                            'duration': '4-5 minutes',
                            'topic': 'Introduction and Interview',
                            'questions': [
                                'Is your hometown a good place for tourists to visit? Why or why not?',
                                'How has your hometown changed in recent years?'
                            ]
                        },
                        {
                            'part': 2,
                            'duration': '3-4 minutes',
                            'topic': 'Individual Long Turn',
                            'prompt': 'Describe a public place you like to visit. You should say: where it is, when you usually go there, what you do there, and explain why you like this place.',
                            'prep_time': 60,
                            'talk_time': 120
                        },
                        {
                            'part': 3,
                            'duration': '4-5 minutes',
                            'topic': 'Two-way Discussion',
                            'questions': [
                                'Do you think individuals or governments should be responsible for protecting the environment?',
                                'How can we encourage more people to use public transportation instead of cars?'
                            ]
                        }
                    ],
                    'total_duration': '11-14 minutes'
                }
            ],
            'general_speaking': [
                {
                    'question_id': 'gs_complete_001',
                    'assessment_type': 'general_speaking',
                    'parts': [
                        {
                            'part': 1,
                            'duration': '4-5 minutes',
                            'topic': 'Introduction and Interview',
                            'questions': [
                                'What activities do you enjoy doing in your free time?',
                                'Do you prefer indoor or outdoor activities? Why?'
                            ]
                        },
                        {
                            'part': 2,
                            'duration': '3-4 minutes',
                            'topic': 'Individual Long Turn',
                            'prompt': 'Describe a historic building you have visited. You should say: where it is, when you visited it, what the building looks like, and explain why you visited this building.',
                            'prep_time': 60,
                            'talk_time': 120
                        },
                        {
                            'part': 3,
                            'duration': '4-5 minutes',
                            'topic': 'Two-way Discussion',
                            'questions': [
                                'How might technology change the way we live in the future?',
                                'Do social media platforms bring people together or push them further apart?'
                            ]
                        }
                    ],
                    'total_duration': '11-14 minutes'
                },
                {
                    'question_id': 'gs_complete_002',
                    'assessment_type': 'general_speaking',
                    'parts': [
                        {
                            'part': 1,
                            'duration': '4-5 minutes',
                            'topic': 'Introduction and Interview',
                            'questions': [
                                'How important is it to have hobbies?',
                                'How often do you use computers or technology in your daily life?'
                            ]
                        },
                        {
                            'part': 2,
                            'duration': '3-4 minutes',
                            'topic': 'Individual Long Turn',
                            'prompt': 'Describe a place in your country that you would recommend someone visit. You should say: where it is, what people can do there, when is the best time to visit, and explain why you would recommend this place.',
                            'prep_time': 60,
                            'talk_time': 120
                        },
                        {
                            'part': 3,
                            'duration': '4-5 minutes',
                            'topic': 'Two-way Discussion',
                            'questions': [
                                'Should there be more regulation of technology and the internet?',
                                'How has family life changed in your country in recent decades?'
                            ]
                        }
                    ],
                    'total_duration': '11-14 minutes'
                },
                {
                    'question_id': 'gs_complete_003',
                    'assessment_type': 'general_speaking',
                    'parts': [
                        {
                            'part': 1,
                            'duration': '4-5 minutes',
                            'topic': 'Introduction and Interview',
                            'questions': [
                                'What impact does technology have on your work or studies?',
                                'Do you think people rely too much on technology nowadays?'
                            ]
                        },
                        {
                            'part': 2,
                            'duration': '3-4 minutes',
                            'topic': 'Individual Long Turn',
                            'prompt': 'Describe an important object in your life. You should say: what it is, how long you\'ve had it, where you got it from, and explain why it\'s important to you.',
                            'prep_time': 60,
                            'talk_time': 120
                        },
                        {
                            'part': 3,
                            'duration': '4-5 minutes',
                            'topic': 'Two-way Discussion',
                            'questions': [
                                'What role should governments play in healthcare and social services?',
                                'Is it better to live in a city or in the countryside? Why?'
                            ]
                        }
                    ],
                    'total_duration': '11-14 minutes'
                },
                {
                    'question_id': 'gs_complete_004',
                    'assessment_type': 'general_speaking',
                    'parts': [
                        {
                            'part': 1,
                            'duration': '4-5 minutes',
                            'topic': 'Introduction and Interview',
                            'questions': [
                                'What kind of places do you like to visit on vacation?',
                                'Do you prefer traveling alone or with other people? Why?'
                            ]
                        },
                        {
                            'part': 2,
                            'duration': '3-4 minutes',
                            'topic': 'Individual Long Turn',
                            'prompt': 'Describe a piece of technology that you find useful. You should say: what it is, what you use it for, how often you use it, and explain why it is so useful to you.',
                            'prep_time': 60,
                            'talk_time': 120
                        },
                        {
                            'part': 3,
                            'duration': '4-5 minutes',
                            'topic': 'Two-way Discussion',
                            'questions': [
                                'How can countries work together more effectively to solve global problems?',
                                'What do you think are the biggest challenges facing young people today?'
                            ]
                        }
                    ],
                    'total_duration': '11-14 minutes'
                },
                {
                    'question_id': 'gs_complete_005',
                    'assessment_type': 'general_speaking',
                    'parts': [
                        {
                            'part': 1,
                            'duration': '4-5 minutes',
                            'topic': 'Introduction and Interview',
                            'questions': [
                                'What\'s the most interesting journey you\'ve ever taken?',
                                'Tell me about your favorite hobby and why you enjoy it.'
                            ]
                        },
                        {
                            'part': 2,
                            'duration': '3-4 minutes',
                            'topic': 'Individual Long Turn',
                            'prompt': 'Describe a book that has influenced you. You should say: what kind of book it is, what it is about, when you first read it, and explain how it has influenced you.',
                            'prep_time': 60,
                            'talk_time': 120
                        },
                        {
                            'part': 3,
                            'duration': '4-5 minutes',
                            'topic': 'Two-way Discussion',
                            'questions': [
                                'Do you think international tourism is mostly positive or negative for local communities?',
                                'How might technology change the way we live in the future?'
                            ]
                        }
                    ],
                    'total_duration': '11-14 minutes'
                }
            ]
        }
        
        bank = question_banks.get(assessment_type, [])
        print(f"[COMPREHENSIVE] Loaded {len(bank)} questions for {assessment_type} - Full Migration Complete")
        return bank

    def mark_question_as_used(self, user_email: str, assessment_type: str, question_id: str) -> bool:
        """Mark question as used by user to prevent repetition"""
        user = self.users_table.get_item(user_email)
        if not user:
            return False
        
        if 'completed_assessments' not in user:
            user['completed_assessments'] = []
        
        # Add this assessment to completed list
        assessment_record = {
            'question_id': question_id,
            'assessment_type': assessment_type,
            'completed_at': datetime.utcnow().isoformat()
        }
        
        user['completed_assessments'].append(assessment_record)
        return self.users_table.put_item(user)

    def record_completed_assessment(self, user_email: str, assessment_type: str, question_id: str, result_data: Dict[str, Any]) -> bool:
        """Record completed assessment and use attempt"""
        user = self.users_table.get_item(user_email)
        if not user:
            return False
        
        # Add to completed assessments
        if 'completed_assessments' not in user:
            user['completed_assessments'] = []
        
        completed_assessment = {
            'assessment_type': assessment_type,
            'question_id': question_id,
            'completed_at': datetime.utcnow().isoformat(),
            'result_data': result_data
        }
        
        user['completed_assessments'].append(completed_assessment)
        
        # Update user record
        return self.users_table.put_item(user)
    
    def get_nova_sonic_prompts(self, assessment_type: str) -> Optional[Dict[str, Any]]:
        """Get Nova Sonic system prompts from DynamoDB rubrics"""
        rubric = self.get_assessment_rubric(assessment_type)
        return rubric.get('nova_sonic_prompts') if rubric else None
    
    def get_nova_micro_prompts(self, assessment_type: str) -> Optional[Dict[str, Any]]:
        """Get Nova Micro system prompts from DynamoDB rubrics"""
        rubric = self.get_assessment_rubric(assessment_type)
        return rubric.get('nova_micro_prompts') if rubric else None

    def get_health_status(self) -> Dict[str, Any]:
        """Get overall system health"""
        return {
            'dynamodb_tables': {
                'users': len(self.users_table.items),
                'assessment_results': len(self.assessment_results_table.items),
                'assessment_rubrics': len(self.assessment_rubrics_table.items),
                'gdpr_consents': len(self.gdpr_consents_table.items),
                'gdpr_data_requests': len(self.gdpr_data_requests_table.items),
                'cookie_preferences': len(self.gdpr_cookie_preferences_table.items)
            },
            'elasticache': {
                'active_sessions': len(self.session_cache.cache)
            },
            'cloudwatch': {
                'log_groups': len(self.cloudwatch.log_groups),
                'metrics_recorded': len(self.cloudwatch.metrics)
            },
            'region': self.region,
            'status': 'healthy',
            'gdpr_compliance': True
        }
    
    # GDPR Compliance Methods
    def get_user_consent(self, user_email: str) -> Dict[str, Any]:
        """Get user's current consent settings"""
        consent_data = self.gdpr_consents_table.get_item(user_email)
        if not consent_data:
            # Default consent settings for new users
            return {
                'user_email': user_email,
                'data_processing': True,  # Required for service
                'audio_processing': True,
                'marketing_emails': False,
                'analytics': False,
                'third_party_sharing': False,
                'last_updated': datetime.utcnow().isoformat()
            }
        return consent_data
    
    def update_user_consent(self, user_email: str, consent_data: Dict[str, Any]) -> bool:
        """Update user's consent settings"""
        consent_record = {
            'user_email': user_email,
            'data_processing': consent_data.get('data_processing', True),
            'audio_processing': consent_data.get('audio_processing', False),
            'marketing_emails': consent_data.get('marketing_emails', False),
            'analytics': consent_data.get('analytics', False),
            'third_party_sharing': consent_data.get('third_party_sharing', False),
            'last_updated': datetime.utcnow().isoformat(),
            'ip_address': consent_data.get('ip_address', ''),
            'user_agent': consent_data.get('user_agent', '')
        }
        
        result = self.gdpr_consents_table.put_item(consent_record)
        if result:
            self.log_event('GDPR_Consent', f'Consent updated for {user_email}')
        return result
    
    def get_cookie_preferences(self, user_email: str) -> Dict[str, Any]:
        """Get user's cookie preferences"""
        cookie_prefs = self.gdpr_cookie_preferences_table.get_item(user_email)
        if not cookie_prefs:
            return {
                'user_email': user_email,
                'necessary': True,  # Always required
                'functional': True,
                'analytics': False,
                'marketing': False,
                'last_updated': datetime.utcnow().isoformat()
            }
        return cookie_prefs
    
    def update_cookie_preferences(self, user_email: str, preferences: Dict[str, Any]) -> bool:
        """Update user's cookie preferences"""
        cookie_record = {
            'user_email': user_email,
            'necessary': True,  # Always required
            'functional': preferences.get('functional', True),
            'analytics': preferences.get('analytics', False),
            'marketing': preferences.get('marketing', False),
            'last_updated': datetime.utcnow().isoformat()
        }
        
        result = self.gdpr_cookie_preferences_table.put_item(cookie_record)
        if result:
            self.log_event('GDPR_Cookie', f'Cookie preferences updated for {user_email}')
        return result
    
    def request_data_export(self, user_email: str, export_format: str = 'json', include_assessments: bool = True) -> str:
        """Create data export request and return request ID"""
        request_id = str(uuid.uuid4())
        
        # Get user data
        user_data = self.users_table.get_item(user_email)
        if not user_data:
            return None
        
        # Get assessment results
        assessment_data = []
        if include_assessments:
            assessment_data = self.get_user_assessments(user_email)
        
        # Get consent history
        consent_data = self.get_user_consent(user_email)
        
        # Prepare export data
        export_data = {
            'user_profile': {
                'email': user_data.get('email'),
                'created_at': user_data.get('created_at'),
                'last_login': user_data.get('last_login'),
                'purchases': user_data.get('purchases', [])
            },
            'assessments': assessment_data,
            'consent_history': consent_data,
            'export_info': {
                'request_id': request_id,
                'format': export_format,
                'created_at': datetime.utcnow().isoformat(),
                'data_as_of': datetime.utcnow().isoformat()
            }
        }
        
        # Store export request
        request_record = {
            'request_id': request_id,
            'user_email': user_email,
            'request_type': 'data_export',
            'format': export_format,
            'include_assessments': include_assessments,
            'status': 'completed',
            'created_at': datetime.utcnow().isoformat(),
            'completed_at': datetime.utcnow().isoformat(),
            'export_data': export_data
        }
        
        self.gdpr_data_requests_table.put_item(request_record)
        self.log_event('GDPR_Export', f'Data export requested by {user_email} - {request_id}')
        
        return request_id
    
    def request_data_deletion(self, user_email: str, deletion_type: str = 'complete') -> str:
        """Create data deletion request and return request ID"""
        request_id = str(uuid.uuid4())
        
        # Store deletion request
        request_record = {
            'request_id': request_id,
            'user_email': user_email,
            'request_type': 'data_deletion',
            'deletion_type': deletion_type,
            'status': 'pending',
            'created_at': datetime.utcnow().isoformat(),
            'scheduled_for': (datetime.utcnow() + timedelta(days=30)).isoformat()
        }
        
        self.gdpr_data_requests_table.put_item(request_record)
        self.log_event('GDPR_Deletion', f'Data deletion requested by {user_email} - {request_id}')
        
        return request_id
    
    def get_gdpr_request_status(self, request_id: str) -> Optional[Dict[str, Any]]:
        """Get status of GDPR request"""
        return self.gdpr_data_requests_table.get_item(request_id)
    
    def get_user_gdpr_requests(self, user_email: str) -> List[Dict[str, Any]]:
        """Get all GDPR requests for a user"""
        all_requests = self.gdpr_data_requests_table.scan()
        return [req for req in all_requests if req.get('user_email') == user_email]

# Global instance for use across the application
aws_mock = AWSMockServices()

# Environment variable simulation
MOCK_ENV_VARS = {
    'AWS_REGION': 'us-east-1',
    'DYNAMODB_AUTH_TOKENS_TABLE': 'ielts-genai-prep-auth-tokens',
    'DYNAMODB_USER_SESSIONS_TABLE': 'ielts-genai-prep-user-sessions',
    'ELASTICACHE_ENDPOINT': 'mock-elasticache.replit.internal',
    'CLOUDWATCH_LOG_GROUP': '/aws/lambda/ielts-genai-prep'
}

def get_mock_env(key: str, default: Optional[str] = None) -> str:
    """Get environment variable with mock fallback"""
    return os.environ.get(key, MOCK_ENV_VARS.get(key, default or ''))