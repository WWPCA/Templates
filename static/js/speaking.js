/**
 * IELTS AI Prep - Speaking Assessment JavaScript
 * 
 * This file handles the speaking assessment functionality with audio recording
 * and submission for analysis. It uses a namespace pattern to avoid conflicts
 * with global variables in other JavaScript files.
 */

// Create a namespace for all speaking assessment variables and functions
const speakingModule = {
    // Recording state variables
    mediaRecorder: null,
    audioChunks: [],
    recordingTimer: null,
    recordingSeconds: 0,
    isRecording: false,
    micTestStream: null,
    micTestAnalyser: null,
    micTestActive: false,
    
    // Format time function for the speaking module (mm:ss format)
    formatTime: function(seconds) {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
};

document.addEventListener('DOMContentLoaded', function() {
    // Initialize the "Listen to Prompt" button if it exists
    const listenToPromptButton = document.getElementById('listenToPrompt');
    if (listenToPromptButton) {
        listenToPromptButton.addEventListener('click', function() {
            const promptId = this.getAttribute('data-prompt-id');
            if (promptId) {
                // Show loading state
                listenToPromptButton.disabled = true;
                listenToPromptButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading...';
                
                // Fetch the audio from the server
                fetch(`/api/speaking/generate-audio/${promptId}`)
                    .then(response => response.json())
                    .then(data => {
                        if (data.success && data.audio_url) {
                            // Enable the button
                            listenToPromptButton.disabled = false;
                            listenToPromptButton.innerHTML = '<i class="fas fa-volume-up"></i> Listen to Prompt';
                            
                            // Show the audio player
                            const promptAudioPlayer = document.getElementById('promptAudioPlayer');
                            const promptAudio = document.getElementById('promptAudio');
                            
                            if (promptAudioPlayer && promptAudio) {
                                promptAudio.src = data.audio_url;
                                promptAudioPlayer.classList.remove('d-none');
                                promptAudio.play();
                            }
                        } else {
                            // Show error
                            listenToPromptButton.disabled = false;
                            listenToPromptButton.innerHTML = '<i class="fas fa-volume-up"></i> Listen to Prompt';
                            alert('Failed to load audio for this prompt. Please try again.');
                        }
                    })
                    .catch(error => {
                        console.error('Error fetching prompt audio:', error);
                        listenToPromptButton.disabled = false;
                        listenToPromptButton.innerHTML = '<i class="fas fa-volume-up"></i> Listen to Prompt';
                        alert('An error occurred while loading the audio. Please try again.');
                    });
            }
        });
    }
    
    // Initialize speaking assessment
    const speakingTest = document.querySelector('.speaking-test');
    if (speakingTest) {
        initializeSpeakingTest();
        
        // Initialize microphone test button
        const micTestButton = document.getElementById('test-microphone-button');
        if (micTestButton) {
            // Create modal only once and reuse it
            const micTestModal = initMicrophoneTest();
            
            // Show modal when button is clicked
            micTestButton.addEventListener('click', function() {
                micTestModal.show();
            });
        }
    }
});

/**
 * Initialize the speaking test functionality
 */
function initializeSpeakingTest() {
    const recordButton = document.getElementById('record-button');
    const stopButton = document.getElementById('stop-button');
    const timerDisplay = document.getElementById('record-time');
    const feedbackContainer = document.getElementById('feedback-container');
    const promptId = document.querySelector('.speaking-test').dataset.promptId;
    
    if (recordButton && stopButton) {
        // Request microphone access
        recordButton.addEventListener('click', function() {
            // Disable button while requesting permission
            recordButton.disabled = true;
            recordButton.textContent = 'Requesting microphone...';
            
            navigator.mediaDevices.getUserMedia({ audio: true })
                .then(stream => {
                    // Re-enable button
                    recordButton.disabled = false;
                    recordButton.textContent = 'Start Recording';
                    
                    // Setup recorder with the stream
                    setupRecorder(stream);
                    
                    // Add click handlers
                    recordButton.addEventListener('click', startRecording);
                    stopButton.addEventListener('click', stopRecording);
                })
                .catch(error => {
                    console.error('Error accessing microphone:', error);
                    recordButton.disabled = true;
                    recordButton.textContent = 'Microphone access denied';
                    
                    // Show error message
                    const errorMsg = document.createElement('div');
                    errorMsg.className = 'alert alert-danger mt-3';
                    errorMsg.textContent = 'Microphone access is required for the speaking assessment. Please allow microphone access in your browser settings and refresh the page.';
                    recordButton.parentNode.appendChild(errorMsg);
                });
        });
        
        // Setup feedback submission
        const submitFeedbackButton = document.getElementById('submit-feedback');
        if (submitFeedbackButton) {
            submitFeedbackButton.addEventListener('click', function() {
                submitSpeakingRecording(promptId);
            });
        }
    }
    
    /**
     * Set up the media recorder with the audio stream
     */
    function setupRecorder(stream) {
        speakingModule.mediaRecorder = new MediaRecorder(stream);
        
        speakingModule.mediaRecorder.ondataavailable = function(event) {
            speakingModule.audioChunks.push(event.data);
        };
        
        speakingModule.mediaRecorder.onstop = function() {
            // Create audio blob
            const audioBlob = new Blob(speakingModule.audioChunks, { type: 'audio/mp3' });
            
            // Create a URL for the blob
            const audioUrl = URL.createObjectURL(audioBlob);
            
            // Display playback controls
            displayAudioPlayback(audioUrl);
            
            // Save blob for submission
            window.recordedAudioBlob = audioBlob;
        };
    }
    
    /**
     * Start recording audio
     */
    function startRecording() {
        // Clear any existing recording
        speakingModule.audioChunks = [];
        speakingModule.recordingSeconds = 0;
        
        // Hide any previous feedback
        if (feedbackContainer) {
            feedbackContainer.innerHTML = '';
            feedbackContainer.style.display = 'none';
        }
        
        // Update UI
        recordButton.disabled = true;
        stopButton.disabled = false;
        timerDisplay.textContent = '00:00';
        timerDisplay.style.display = 'inline';
        
        // Start recording
        speakingModule.mediaRecorder.start();
        speakingModule.isRecording = true;
        
        // Start timer
        speakingModule.recordingTimer = setInterval(function() {
            speakingModule.recordingSeconds++;
            timerDisplay.textContent = speakingModule.formatTime(speakingModule.recordingSeconds);
            
            // Auto-stop after 2 minutes (IELTS speaking responses are typically 1-2 minutes)
            if (speakingModule.recordingSeconds >= 120) {
                stopRecording();
            }
        }, 1000);
        
        console.log('Recording started');
    }
    
    /**
     * Stop recording audio
     */
    function stopRecording() {
        if (!speakingModule.isRecording) return;
        
        // Stop the recorder
        speakingModule.mediaRecorder.stop();
        speakingModule.isRecording = false;
        
        // Stop the timer
        clearInterval(speakingModule.recordingTimer);
        
        // Update UI
        recordButton.disabled = false;
        stopButton.disabled = true;
        
        console.log('Recording stopped');
    }
    
    /**
     * Display audio playback controls after recording
     */
    function displayAudioPlayback(audioUrl) {
        const playbackContainer = document.getElementById('audio-playback');
        if (playbackContainer) {
            playbackContainer.innerHTML = `
                <div class="card mt-3">
                    <div class="card-header">
                        <h4>Your Recording (${speakingModule.formatTime(speakingModule.recordingSeconds)})</h4>
                    </div>
                    <div class="card-body">
                        <audio controls src="${audioUrl}" class="w-100"></audio>
                        <div class="d-flex justify-content-between mt-3">
                            <button id="re-record-button" class="btn btn-secondary">
                                <i class="fa fa-redo"></i> Record Again
                            </button>
                            <button id="submit-feedback" class="btn btn-primary">
                                <i class="fa fa-paper-plane"></i> Get Feedback
                            </button>
                        </div>
                    </div>
                </div>
            `;
            
            // Add re-record button handler
            document.getElementById('re-record-button').addEventListener('click', function() {
                playbackContainer.innerHTML = '';
                window.recordedAudioBlob = null;
            });
            
            // Add submit button handler
            document.getElementById('submit-feedback').addEventListener('click', function() {
                submitSpeakingRecording(promptId);
            });
        }
    }
}

/**
 * Submit the speaking recording for analysis
 */
function submitSpeakingRecording(promptId) {
    if (!window.recordedAudioBlob) {
        console.error('No recording available');
        return;
    }
    
    // Show loading state
    const feedbackContainer = document.getElementById('feedback-container');
    feedbackContainer.style.display = 'block';
    feedbackContainer.innerHTML = `
        <div class="card mt-4">
            <div class="card-body text-center">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
                <p class="mt-2">Analyzing your speaking response...</p>
                <p class="small text-muted">This may take up to 30 seconds.</p>
            </div>
        </div>
    `;
    
    // Create form data for upload
    const formData = new FormData();
    formData.append('prompt_id', promptId);
    formData.append('audio', window.recordedAudioBlob, 'recording.mp3');
    
    // Check connection status
    if (!navigator.onLine) {
        showConnectionLostFeedback();
        return;
    }
    
    // Submit recording to server
    fetch('/api/speaking/submit', {
        method: 'POST',
        body: formData
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        return response.json();
    })
    .then(data => {
        displayFeedback(data);
    })
    .catch(error => {
        console.error('Error submitting recording:', error);
        showErrorFeedback();
    });
}

/**
 * Display speaking assessment feedback
 */
function displayFeedback(data) {
    const feedbackContainer = document.getElementById('feedback-container');
    if (!feedbackContainer) return;
    
    // Format scores for display
    const scores = data.scores;
    
    feedbackContainer.innerHTML = `
        <div class="card mt-4">
            <div class="card-header bg-primary text-white">
                <h3>Speaking Assessment Results</h3>
            </div>
            <div class="card-body">
                <div class="row">
                    <div class="col-md-4 text-center">
                        <div class="score-circle">
                            <div class="score-number">${scores.overall}</div>
                            <div class="score-label">Overall Band</div>
                        </div>
                    </div>
                    <div class="col-md-8">
                        <h4>Detailed Scores</h4>
                        <div class="score-bars">
                            <div class="score-bar">
                                <div class="score-label">Fluency & Coherence</div>
                                <div class="progress">
                                    <div class="progress-bar" role="progressbar" style="width: ${scores.fluency/9*100}%" 
                                        aria-valuenow="${scores.fluency}" aria-valuemin="0" aria-valuemax="9">
                                        ${scores.fluency}
                                    </div>
                                </div>
                            </div>
                            <div class="score-bar">
                                <div class="score-label">Lexical Resource</div>
                                <div class="progress">
                                    <div class="progress-bar" role="progressbar" style="width: ${scores.vocabulary/9*100}%" 
                                        aria-valuenow="${scores.vocabulary}" aria-valuemin="0" aria-valuemax="9">
                                        ${scores.vocabulary}
                                    </div>
                                </div>
                            </div>
                            <div class="score-bar">
                                <div class="score-label">Grammar Range & Accuracy</div>
                                <div class="progress">
                                    <div class="progress-bar" role="progressbar" style="width: ${scores.grammar/9*100}%" 
                                        aria-valuenow="${scores.grammar}" aria-valuemin="0" aria-valuemax="9">
                                        ${scores.grammar}
                                    </div>
                                </div>
                            </div>
                            <div class="score-bar">
                                <div class="score-label">Pronunciation</div>
                                <div class="progress">
                                    <div class="progress-bar" role="progressbar" style="width: ${scores.pronunciation/9*100}%" 
                                        aria-valuenow="${scores.pronunciation}" aria-valuemin="0" aria-valuemax="9">
                                        ${scores.pronunciation}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="mt-4">
                    <h4>Transcription</h4>
                    <div class="transcription-box p-3 bg-light">
                        ${data.transcription}
                    </div>
                </div>
                
                <div class="mt-4">
                    <h4>Detailed Feedback</h4>
                    <div class="feedback-text">
                        ${data.feedback.replace(/\n/g, '<br>')}
                    </div>
                </div>
                
                ${data.feedback_audio_url ? `
                <div class="mt-4">
                    <h4>Audio Feedback</h4>
                    <audio controls src="${data.feedback_audio_url}" class="w-100"></audio>
                    <p class="small text-muted mt-2">Listen to your feedback. This can help you improve your listening skills as well!</p>
                </div>
                ` : ''}
                
                <div class="mt-4 text-center">
                    <a href="/speaking" class="btn btn-primary">Try Another Prompt</a>
                </div>
            </div>
        </div>
    `;
}

/**
 * Show connection lost feedback message
 */
function showConnectionLostFeedback() {
    const feedbackContainer = document.getElementById('feedback-container');
    if (feedbackContainer) {
        feedbackContainer.innerHTML = `
            <div class="alert alert-warning">
                <h4>Connection Lost</h4>
                <p>Speaking assessment requires an active internet connection. Please check your connection and try again.</p>
                <p>Your recording is still available. Click the button below once your connection is restored.</p>
                <button class="btn btn-primary mt-3" onclick="window.location.reload()">Try Again</button>
            </div>
        `;
    }
}

/**
 * Show error feedback message
 */
function showErrorFeedback() {
    const feedbackContainer = document.getElementById('feedback-container');
    if (feedbackContainer) {
        feedbackContainer.innerHTML = `
            <div class="alert alert-danger">
                <h4>Error Processing Recording</h4>
                <p>We encountered an error while analyzing your speaking response. Please try again.</p>
                <p>If the problem persists, please try a different browser or device.</p>
                <button class="btn btn-primary mt-3" onclick="window.location.reload()">Reload Page</button>
            </div>
        `;
    }
}

/**
 * Initialize the microphone test functionality
 */
function initMicrophoneTest() {
    // Create modal for microphone test
    const modal = document.createElement('div');
    modal.className = 'modal fade';
    modal.id = 'micTestModal';
    modal.tabIndex = '-1';
    modal.setAttribute('aria-labelledby', 'micTestModalLabel');
    modal.setAttribute('aria-hidden', 'true');
    
    modal.innerHTML = `
        <div class="modal-dialog modal-lg">
            <div class="modal-content">
                <div class="modal-header bg-primary text-white">
                    <h5 class="modal-title" id="micTestModalLabel">Test Your Microphone</h5>
                    <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body">
                    <div class="alert alert-info">
                        <i class="fas fa-info-circle me-2"></i> 
                        Testing your microphone before starting the speaking assessment will help ensure your response is recorded properly.
                    </div>
                    
                    <div class="row mb-4">
                        <div class="col-md-6">
                            <div class="card h-100">
                                <div class="card-header">
                                    <h5>Step 1: Test Microphone Input</h5>
                                </div>
                                <div class="card-body">
                                    <div class="text-center mb-3">
                                        <button id="startMicTest" class="btn btn-primary">
                                            <i class="fas fa-microphone me-2"></i> Start Microphone Test
                                        </button>
                                        <button id="stopMicTest" class="btn btn-secondary" style="display:none;">
                                            <i class="fas fa-stop me-2"></i> Stop Testing
                                        </button>
                                    </div>
                                    
                                    <div class="mic-level-container text-center" style="display:none;">
                                        <p class="mb-2">Speak into your microphone:</p>
                                        <div class="mic-level-meter">
                                            <div class="mic-level-bar" style="height: 20px; background-color: #007bff; width: 0%;"></div>
                                        </div>
                                        <p class="mic-status mt-2">Not detecting audio...</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div class="col-md-6">
                            <div class="card h-100">
                                <div class="card-header">
                                    <h5>Step 2: Test Recording & Playback</h5>
                                </div>
                                <div class="card-body">
                                    <div class="text-center mb-3">
                                        <button id="startTestRecording" class="btn btn-danger" disabled>
                                            <i class="fas fa-circle me-2"></i> Record Test Audio
                                        </button>
                                        <button id="stopTestRecording" class="btn btn-secondary" style="display:none;">
                                            <i class="fas fa-stop me-2"></i> Stop Recording
                                        </button>
                                    </div>
                                    
                                    <div id="testRecordingTime" class="text-center mb-3" style="display:none;">
                                        Recording: <span class="test-timer">00:00</span>
                                    </div>
                                    
                                    <div id="testPlaybackContainer" class="text-center" style="display:none;">
                                        <p>Test Recording:</p>
                                        <audio id="testRecordingPlayback" controls class="w-100"></audio>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="mic-test-results" style="display:none;">
                        <div class="alert alert-success">
                            <h5><i class="fas fa-check-circle me-2"></i> Your microphone is working properly!</h5>
                            <p>You're ready to take the speaking assessment. Remember these tips:</p>
                            <ul class="mb-0">
                                <li>Speak clearly at a normal volume and pace</li>
                                <li>Position yourself in a quiet environment</li>
                                <li>Keep a consistent distance from your microphone</li>
                            </ul>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                    <button type="button" class="btn btn-primary" id="proceedToAssessment" disabled>Ready to Start Assessment</button>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Initialize Bootstrap modal
    const micTestModal = new bootstrap.Modal(document.getElementById('micTestModal'));
    
    // Mic test button click handler
    document.getElementById('startMicTest').addEventListener('click', function() {
        startMicrophoneTest();
    });
    
    // Stop mic test button click handler
    document.getElementById('stopMicTest').addEventListener('click', function() {
        stopMicrophoneTest();
    });
    
    // Test recording button click handler
    document.getElementById('startTestRecording').addEventListener('click', function() {
        startTestRecording();
    });
    
    // Stop test recording button click handler
    document.getElementById('stopTestRecording').addEventListener('click', function() {
        stopTestRecording();
    });
    
    // Ready button click handler
    document.getElementById('proceedToAssessment').addEventListener('click', function() {
        micTestModal.hide();
    });
    
    // Clean up when modal is closed
    document.getElementById('micTestModal').addEventListener('hidden.bs.modal', function() {
        stopMicrophoneTest();
        if (speakingModule.testRecordingStream) {
            speakingModule.testRecordingStream.getTracks().forEach(track => track.stop());
            speakingModule.testRecordingStream = null;
        }
    });
    
    return micTestModal;
}

/**
 * Start microphone test with audio level visualization
 */
function startMicrophoneTest() {
    // Show the mic level container and hide the start button
    document.querySelector('.mic-level-container').style.display = 'block';
    document.getElementById('startMicTest').style.display = 'none';
    document.getElementById('stopMicTest').style.display = 'inline-block';
    
    // Request microphone access
    navigator.mediaDevices.getUserMedia({ audio: true })
        .then(stream => {
            speakingModule.micTestStream = stream;
            speakingModule.micTestActive = true;
            
            // Create audio context and analyzer
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const analyser = audioContext.createAnalyser();
            const microphone = audioContext.createMediaStreamSource(stream);
            const javascriptNode = audioContext.createScriptProcessor(2048, 1, 1);
            
            analyser.smoothingTimeConstant = 0.8;
            analyser.fftSize = 1024;
            
            microphone.connect(analyser);
            analyser.connect(javascriptNode);
            javascriptNode.connect(audioContext.destination);
            
            speakingModule.micTestAnalyser = {
                audioContext: audioContext,
                analyser: analyser,
                javascriptNode: javascriptNode
            };
            
            // Enable the test recording button
            document.getElementById('startTestRecording').disabled = false;
            
            // Process audio data to show volume levels
            javascriptNode.onaudioprocess = function() {
                if (!speakingModule.micTestActive) return;
                
                const array = new Uint8Array(analyser.frequencyBinCount);
                analyser.getByteFrequencyData(array);
                let values = 0;
                
                const length = array.length;
                for (let i = 0; i < length; i++) {
                    values += (array[i]);
                }
                
                const average = values / length;
                const levelPercentage = Math.min(100, average * 2);
                
                // Update level meter
                const levelBar = document.querySelector('.mic-level-bar');
                levelBar.style.width = levelPercentage + '%';
                
                // Change color based on level
                if (levelPercentage < 30) {
                    levelBar.style.backgroundColor = '#28a745'; // Green - OK
                } else if (levelPercentage < 80) {
                    levelBar.style.backgroundColor = '#007bff'; // Blue - Good
                } else {
                    levelBar.style.backgroundColor = '#dc3545'; // Red - Too loud
                }
                
                // Update status text
                const statusText = document.querySelector('.mic-status');
                if (levelPercentage < 5) {
                    statusText.textContent = 'Not detecting audio...';
                } else if (levelPercentage < 30) {
                    statusText.textContent = 'Audio level: Low';
                } else if (levelPercentage < 80) {
                    statusText.textContent = 'Audio level: Good';
                } else {
                    statusText.textContent = 'Audio level: Too loud!';
                }
            };
        })
        .catch(error => {
            console.error('Error accessing microphone for test:', error);
            document.querySelector('.mic-level-container').innerHTML = `
                <div class="alert alert-danger">
                    <h5><i class="fas fa-exclamation-triangle me-2"></i> Microphone access denied</h5>
                    <p>Please allow microphone access in your browser settings and try again.</p>
                </div>
            `;
            document.getElementById('startMicTest').style.display = 'inline-block';
            document.getElementById('stopMicTest').style.display = 'none';
        });
}

/**
 * Stop microphone test
 */
function stopMicrophoneTest() {
    if (speakingModule.micTestStream) {
        speakingModule.micTestActive = false;
        speakingModule.micTestStream.getTracks().forEach(track => track.stop());
        
        if (speakingModule.micTestAnalyser && speakingModule.micTestAnalyser.javascriptNode) {
            speakingModule.micTestAnalyser.javascriptNode.onaudioprocess = null;
        }
        
        // Reset UI
        document.getElementById('startMicTest').style.display = 'inline-block';
        document.getElementById('stopMicTest').style.display = 'none';
        
        // Show success message if we made it this far
        document.querySelector('.mic-test-results').style.display = 'block';
        document.getElementById('proceedToAssessment').disabled = false;
    }
}

/**
 * Start a test recording to verify recording and playback capabilities
 */
function startTestRecording() {
    // Reset UI
    document.getElementById('startTestRecording').style.display = 'none';
    document.getElementById('stopTestRecording').style.display = 'inline-block';
    document.getElementById('testRecordingTime').style.display = 'block';
    document.getElementById('testPlaybackContainer').style.display = 'none';
    
    // Initialize test recording variables
    speakingModule.testAudioChunks = [];
    speakingModule.testRecordingSeconds = 0;
    
    // Get microphone access for recording
    navigator.mediaDevices.getUserMedia({ audio: true })
        .then(stream => {
            speakingModule.testRecordingStream = stream;
            
            // Create media recorder
            speakingModule.testMediaRecorder = new MediaRecorder(stream);
            
            // Set up recorder events
            speakingModule.testMediaRecorder.ondataavailable = function(event) {
                speakingModule.testAudioChunks.push(event.data);
            };
            
            speakingModule.testMediaRecorder.onstop = function() {
                // Create audio blob
                const audioBlob = new Blob(speakingModule.testAudioChunks, { type: 'audio/mp3' });
                
                // Create URL for playback
                const audioUrl = URL.createObjectURL(audioBlob);
                
                // Show playback controls
                document.getElementById('testPlaybackContainer').style.display = 'block';
                document.getElementById('testRecordingPlayback').src = audioUrl;
            };
            
            // Start recording
            speakingModule.testMediaRecorder.start();
            
            // Start timer
            speakingModule.testRecordingTimer = setInterval(function() {
                speakingModule.testRecordingSeconds++;
                document.querySelector('.test-timer').textContent = speakingModule.formatTime(speakingModule.testRecordingSeconds);
                
                // Auto-stop after 10 seconds for the test
                if (speakingModule.testRecordingSeconds >= 10) {
                    stopTestRecording();
                }
            }, 1000);
        })
        .catch(error => {
            console.error('Error starting test recording:', error);
            document.getElementById('startTestRecording').style.display = 'inline-block';
            document.getElementById('stopTestRecording').style.display = 'none';
            
            // Show error message
            document.getElementById('testRecordingTime').style.display = 'none';
            document.getElementById('testPlaybackContainer').innerHTML = `
                <div class="alert alert-danger">
                    <p>Error accessing microphone for recording test. Please check your microphone permissions.</p>
                </div>
            `;
            document.getElementById('testPlaybackContainer').style.display = 'block';
        });
}

/**
 * Stop the test recording
 */
function stopTestRecording() {
    if (speakingModule.testMediaRecorder && speakingModule.testMediaRecorder.state !== 'inactive') {
        // Stop recording
        speakingModule.testMediaRecorder.stop();
        
        // Stop timer
        clearInterval(speakingModule.testRecordingTimer);
        
        // Update UI
        document.getElementById('startTestRecording').style.display = 'inline-block';
        document.getElementById('stopTestRecording').style.display = 'none';
        
        // Enable the ready button
        document.getElementById('proceedToAssessment').disabled = false;
        document.querySelector('.mic-test-results').style.display = 'block';
    }
}
