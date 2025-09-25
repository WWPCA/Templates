/**
 * IELTS AI Prep - Practice Tests JavaScript
 */

document.addEventListener('DOMContentLoaded', function() {
    // Initialize practice test functionality
    const practiceTest = document.querySelector('.practice-test');
    if (practiceTest) {
        initializePracticeTest();
    }
    
    // Initialize the timer if needed
    const timerElement = document.getElementById('test-timer');
    if (timerElement) {
        const testType = timerElement.dataset.testType;
        let timeLimit;
        
        switch (testType) {
            case 'listening':
                timeLimit = 40 * 60; // 30 min test + 10 min transfer time
                break;
            case 'reading':
                timeLimit = 60 * 60; // 60 min
                break;
            case 'writing':
                timeLimit = 60 * 60; // 60 min
                break;
            default:
                timeLimit = 60 * 60; // Default 60 min
        }
        
        startTimer(timerElement, timeLimit);
    }
    
    // Initialize audio player for listening tests
    const audioElement = document.getElementById('listening-audio');
    const playButton = document.getElementById('play-audio');
    const currentTimeDisplay = document.getElementById('current-time');
    const durationDisplay = document.getElementById('duration');
    const audioProgress = document.getElementById('audio-progress');
    
    if (audioElement && playButton) {
        initializeAudioPlayer(audioElement, playButton, currentTimeDisplay, durationDisplay, audioProgress);
    }
    
    // Add event listener to the form submission
    const testForm = document.getElementById('practice-test-form');
    if (testForm) {
        testForm.addEventListener('submit', submitTest);
    }
    
    // Initialize word counter for writing tests
    const writingTextarea = document.querySelector('.writing-textarea');
    if (writingTextarea) {
        initializeWordCounter(writingTextarea);
    }
    
    // Initialize audio player for listening tests
    const audioPlayer = document.getElementById('listening-audio');
    if (audioPlayer) {
        initializeAudioPlayer(audioPlayer);
    }
    
    // Set up connection status monitoring
    if (typeof setupConnectionHandling === 'function') {
        setupConnectionHandling();
    }
});

/**
 * Initialize practice test functionality
 */
function initializePracticeTest() {
    // Add question numbering
    const questions = document.querySelectorAll('.question');
    questions.forEach((question, index) => {
        const questionNumber = document.createElement('span');
        questionNumber.className = 'question-number';
        questionNumber.textContent = `${index + 1}. `;
        
        const questionText = question.querySelector('.question-text');
        if (questionText) {
            questionText.prepend(questionNumber);
        }
    });
}

/**
 * Start the test timer
 */
function startTimer(timerElement, seconds) {
    let timeRemaining = seconds;
    
    // Update timer display
    function updateTimer() {
        timerElement.textContent = formatTime(timeRemaining);
        
        // Add warning class when less than 5 minutes remaining
        if (timeRemaining <= 300) {
            timerElement.classList.add('timer-warning');
        }
        
        // Add danger class when less than 1 minute remaining
        if (timeRemaining <= 60) {
            timerElement.classList.add('timer-danger');
        }
    }
    
    // Initial display
    updateTimer();
    
    // Update every second
    const timerInterval = setInterval(function() {
        timeRemaining--;
        updateTimer();
        
        // Save remaining time to localStorage for persistence
        localStorage.setItem('practiceTestTimeRemaining', timeRemaining);
        
        if (timeRemaining <= 0) {
            clearInterval(timerInterval);
            timerElement.textContent = 'Time\'s up!';
            
            // Auto-submit the test
            const testForm = document.getElementById('practice-test-form');
            if (testForm) {
                testForm.dispatchEvent(new Event('submit'));
            }
        }
    }, 1000);
    
    // Check if there's a previously saved timer
    const savedTime = localStorage.getItem('practiceTestTimeRemaining');
    if (savedTime) {
        timeRemaining = parseInt(savedTime);
        updateTimer();
    }
}

/**
 * Submit test answers
 */
function submitTest(event) {
    event.preventDefault();
    
    // Get test ID
    const testId = this.dataset.testId;
    
    // Collect all answers
    const answers = {};
    const answerInputs = document.querySelectorAll('.answer-input');
    
    answerInputs.forEach(input => {
        const questionId = input.dataset.questionId;
        const answer = input.value.trim();
        answers[questionId] = answer;
    });
    
    // Save answers to localStorage as backup
    saveAnswersToLocalStorage(testId, answers);
    
    // Check connection status
    if (!navigator.onLine) {
        showConnectionLostMessage();
        return;
    }
    
    // Submit answers to server
    fetch('/api/submit-test', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            test_id: testId,
            answers: answers
        })
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        return response.json();
    })
    .then(data => {
        displayTestResults(data);
        
        // Clear the timer and saved data
        localStorage.removeItem('practiceTestTimeRemaining');
        localStorage.removeItem(`testAnswers_${testId}`);
    })
    .catch(error => {
        console.error('Error submitting test:', error);
        saveTestForLater(testId, answers);
    });
}

/**
 * Save answers to localStorage for offline recovery
 */
function saveAnswersToLocalStorage(testId, answers) {
    localStorage.setItem(`testAnswers_${testId}`, JSON.stringify({
        testId: testId,
        answers: answers,
        date: new Date().toISOString()
    }));
}

/**
 * Save current test session temporarily 
 */
function saveTestForLater(testId, answers) {
    sessionStorage.setItem(`testSession_${testId}`, JSON.stringify({
        testId: testId,
        answers: answers,
        date: new Date().toISOString()
    }));
    
    showConnectionLostMessage();
}

/**
 * Show connection lost message when test can't be submitted
 */
function showConnectionLostMessage() {
    const resultContainer = document.getElementById('test-results');
    if (resultContainer) {
        resultContainer.innerHTML = `
            <div class="alert alert-warning">
                <h4>Connection Lost</h4>
                <p>We couldn't submit your test because the connection was lost.</p>
                <p>Please check your internet connection and try again.</p>
                <button class="btn btn-primary mt-3" onclick="window.location.reload()">Reload Page</button>
            </div>
        `;
    }
}

/**
 * Display test results
 */
function displayTestResults(data) {
    const resultContainer = document.getElementById('test-results');
    if (resultContainer) {
        resultContainer.innerHTML = `
            <div class="card">
                <div class="card-header bg-primary text-white">
                    <h3>Test Results</h3>
                </div>
                <div class="card-body">
                    <div class="score-circle">
                        <div class="score-number">${data.score.toFixed(1)}%</div>
                    </div>
                    <div class="score-details">
                        <p>You answered ${data.correct} out of ${data.total} questions correctly.</p>
                    </div>
                    <div class="mt-4">
                        <a href="/practice" class="btn btn-primary">Back to Practice Tests</a>
                    </div>
                </div>
            </div>
        `;
        
        // Scroll to results
        resultContainer.scrollIntoView({ behavior: 'smooth' });
    }
}

/**
 * Initialize word counter for writing tests
 */
function initializeWordCounter(textarea) {
    const wordCountDisplay = document.getElementById('word-count');
    const minWords = parseInt(textarea.dataset.minWords || 0);
    
    function updateWordCount() {
        const text = textarea.value.trim();
        const wordCount = text ? text.split(/\s+/).length : 0;
        
        wordCountDisplay.textContent = `${wordCount} words`;
        
        // Add warning class if below minimum
        if (wordCount < minWords) {
            wordCountDisplay.className = 'word-count text-danger';
        } else {
            wordCountDisplay.className = 'word-count text-success';
        }
    }
    
    textarea.addEventListener('input', updateWordCount);
    updateWordCount(); // Initial count
}

/**
 * Initialize audio player for listening tests
 */
function initializeAudioPlayer(audioPlayer) {
    // Wait for DOM to be fully loaded
    if (!document.getElementById('play-audio')) {
        console.warn('Audio player elements not found, retrying in 500ms...');
        setTimeout(() => initializeAudioPlayer(audioPlayer), 500);
        return;
    }
    
    const playButton = document.getElementById('play-audio');
    const progressBar = document.getElementById('audio-progress');
    const currentTimeDisplay = document.getElementById('current-time');
    const durationDisplay = document.getElementById('duration');
    
    // We've removed the external message listener to prevent popup errors
    
    if (playButton && progressBar) {
        // Lazy load the audio to avoid Replit embedded page issues
        if (audioPlayer.hasAttribute('data-src') && !audioPlayer.hasAttribute('src')) {
            const audioSrc = audioPlayer.getAttribute('data-src');
            
            // Set up play/pause functionality
            playButton.addEventListener('click', function() {
                // If audio source not loaded yet, load it first
                if (!audioPlayer.hasAttribute('src')) {
                    console.log('Loading audio from:', audioSrc);
                    audioPlayer.setAttribute('src', audioSrc);
                    
                    // Wait for it to be ready before playing
                    audioPlayer.addEventListener('canplay', function onCanPlay() {
                        audioPlayer.play();
                        playButton.innerHTML = '<i class="fa fa-pause"></i> Pause';
                        audioPlayer.removeEventListener('canplay', onCanPlay);
                    });
                    
                    // Load the audio
                    audioPlayer.load();
                    return;
                }
                
                // Normal play/pause behavior
                if (audioPlayer.paused) {
                    audioPlayer.play();
                    playButton.innerHTML = '<i class="fa fa-pause"></i> Pause';
                } else {
                    audioPlayer.pause();
                    playButton.innerHTML = '<i class="fa fa-play"></i> Play';
                }
            });
        } else {
            // Traditional approach if data-src isn't used
            playButton.addEventListener('click', function() {
                if (audioPlayer.paused) {
                    audioPlayer.play();
                    playButton.innerHTML = '<i class="fa fa-pause"></i> Pause';
                } else {
                    audioPlayer.pause();
                    playButton.innerHTML = '<i class="fa fa-play"></i> Play';
                }
            });
        }
        
        // Update progress bar as audio plays
        audioPlayer.addEventListener('timeupdate', function() {
            const progress = (audioPlayer.currentTime / audioPlayer.duration) * 100;
            progressBar.value = progress;
            
            // Update time display
            currentTimeDisplay.textContent = formatTime(Math.floor(audioPlayer.currentTime));
        });
        
        // Enable seeking
        progressBar.addEventListener('input', function() {
            const seekTime = (progressBar.value / 100) * audioPlayer.duration;
            audioPlayer.currentTime = seekTime;
        });
        
        // Display duration when metadata is loaded
        audioPlayer.addEventListener('loadedmetadata', function() {
            durationDisplay.textContent = formatTime(Math.floor(audioPlayer.duration));
        });
        
        // Reset button when audio ends
        audioPlayer.addEventListener('ended', function() {
            playButton.innerHTML = '<i class="fa fa-play"></i> Play';
            progressBar.value = 0;
        });
        
        // Handle errors
        audioPlayer.addEventListener('error', function(e) {
            console.error('Error loading audio:', e);
            
            // Try alternative URL format if normal loading fails
            if (!audioPlayer.retryAttempted && audioPlayer.hasAttribute('src')) {
                audioPlayer.retryAttempted = true;
                const currentSrc = audioPlayer.getAttribute('src');
                const audioFilename = currentSrc.split('/').pop();
                
                // Try direct URL to audio
                console.log('Trying alternative audio source:', '/audio/' + audioFilename);
                audioPlayer.setAttribute('src', '/audio/' + audioFilename);
                audioPlayer.load();
                return;
            }
            
            // Show error message and fallback option
            const errorMessage = document.getElementById('audio-error-message');
            if (errorMessage) {
                errorMessage.classList.remove('d-none');
                
                // Set up fallback link
                const fallbackLink = document.getElementById('audio-fallback-link');
                if (fallbackLink) {
                    fallbackLink.addEventListener('click', function(event) {
                        event.preventDefault();
                        
                        // Try opening audio in a new tab
                        const audioSrc = audioPlayer.getAttribute('data-src') || audioPlayer.getAttribute('src');
                        if (audioSrc) {
                            window.open(audioSrc, '_blank');
                        }
                    });
                }
            }
            
            playButton.disabled = true;
            playButton.textContent = 'Audio unavailable';
        });
    }
}

// End of practice.js
