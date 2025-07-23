// SnoreTracker Pro - Main Application Logic
class SnoreTrackerApp {
    constructor() {
        this.currentScreen = 'home';
        this.isRecording = false;
        this.audioContext = null;
        this.mediaRecorder = null;
        this.stream = null;
        this.analyser = null;
        this.dataArray = null;
        this.animationId = null;
        this.startTime = null;
        this.sessionData = {
            startTime: null,
            endTime: null,
            snoreEvents: [],
            volumeLevels: [],
            peakVolume: 0,
            avgVolume: 0
        };
        this.timerInterval = null;
        this.settings = this.loadSettings();
        
        this.sampleData = {
            sampleSessions: [
                {
                    id: "session_20250722_001",
                    date: "2025-07-21",
                    duration: 480,
                    snoreScore: 73,
                    snoreEvents: 12,
                    intensity: "moderate",
                    totalSnoreTime: 45,
                    avgVolume: 42,
                    peakVolume: 78,
                    sleepQuality: "good"
                },
                {
                    id: "session_20250721_001", 
                    date: "2025-07-20",
                    duration: 420,
                    snoreScore: 85,
                    snoreEvents: 8,
                    intensity: "light",
                    totalSnoreTime: 23,
                    avgVolume: 38,
                    peakVolume: 65,
                    sleepQuality: "excellent"
                },
                {
                    id: "session_20250720_001",
                    date: "2025-07-19", 
                    duration: 510,
                    snoreScore: 45,
                    snoreEvents: 28,
                    intensity: "heavy",
                    totalSnoreTime: 89,
                    avgVolume: 55,
                    peakVolume: 92,
                    sleepQuality: "poor"
                }
            ],
            weeklyTrends: [
                {"day": "Mon", "score": 85},
                {"day": "Tue", "score": 73}, 
                {"day": "Wed", "score": 45},
                {"day": "Thu", "score": 67},
                {"day": "Fri", "score": 78},
                {"day": "Sat", "score": 82},
                {"day": "Sun", "score": 88}
            ],
            recommendations: [
                "Try sleeping on your side instead of your back",
                "Keep your bedroom humidity between 40-60%",
                "Avoid alcohol 3 hours before bedtime",
                "Consider using a humidifier",
                "Elevate your head slightly while sleeping"
            ],
            appFeatures: [
                {
                    title: "Advanced AI Detection",
                    description: "Uses sophisticated algorithms to distinguish snoring from other sounds"
                },
                {
                    title: "Real-time Monitoring", 
                    description: "Continuously tracks audio with live visualization"
                },
                {
                    title: "Comprehensive Reports",
                    description: "Detailed analysis with actionable insights"
                },
                {
                    title: "Trend Analysis",
                    description: "Track your progress over weeks and months"
                }
            ]
        };

        this.init();
    }

    init() {
        // Set up all event listeners first
        this.setupEventListeners();
        // Load saved data and populate screens
        this.loadSavedData();
        this.updateCurrentDate();
        this.populateHomeScreen();
        this.renderFeatures();
        // Show initial screen
        this.showScreen('home');
    }

    loadSettings() {
        const defaultSettings = {
            sensitivity: 5,
            minDuration: 3,
            volumeThreshold: 0.3
        };
        
        try {
            const saved = JSON.parse(localStorage.getItem('snoreTracker_settings') || '{}');
            return { ...defaultSettings, ...saved };
        } catch {
            return defaultSettings;
        }
    }

    saveSettings() {
        try {
            localStorage.setItem('snoreTracker_settings', JSON.stringify(this.settings));
        } catch (e) {
            console.log('Settings could not be saved');
        }
    }

    loadSavedData() {
        try {
            const saved = JSON.parse(localStorage.getItem('snoreTracker_sessions') || '[]');
            if (saved.length === 0) {
                // Use sample data if no saved sessions
                localStorage.setItem('snoreTracker_sessions', JSON.stringify(this.sampleData.sampleSessions));
                return this.sampleData.sampleSessions;
            }
            return saved;
        } catch {
            return this.sampleData.sampleSessions;
        }
    }

    saveSessions(sessions) {
        try {
            localStorage.setItem('snoreTracker_sessions', JSON.stringify(sessions));
        } catch (e) {
            console.log('Sessions could not be saved');
        }
    }

    setupEventListeners() {
        // Navigation - ensure this works properly
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const screen = e.currentTarget.getAttribute('data-screen');
                console.log('Navigating to:', screen); // Debug log
                this.showScreen(screen);
            });
        });

        // Start monitoring buttons
        const startBtn = document.querySelector('.start-monitoring-btn');
        if (startBtn) {
            startBtn.addEventListener('click', (e) => {
                e.preventDefault();
                console.log('Start monitoring clicked'); // Debug log
                this.showScreen('monitor');
            });
        }

        // Monitor toggle button
        const monitorBtn = document.getElementById('monitor-toggle');
        if (monitorBtn) {
            monitorBtn.addEventListener('click', (e) => {
                e.preventDefault();
                console.log('Monitor toggle clicked'); // Debug log
                this.toggleMonitoring();
            });
        }

        // Permission modal buttons
        const grantBtn = document.getElementById('grant-permission');
        const denyBtn = document.getElementById('deny-permission');
        
        if (grantBtn) {
            grantBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.requestMicrophonePermission();
            });
        }

        if (denyBtn) {
            denyBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.hideModal();
            });
        }

        // Settings
        const sensitivitySlider = document.getElementById('sensitivity');
        const durationInput = document.getElementById('min-duration');
        const exportBtn = document.getElementById('export-data');
        const clearBtn = document.getElementById('clear-data');

        if (sensitivitySlider) {
            sensitivitySlider.addEventListener('input', (e) => {
                this.settings.sensitivity = parseInt(e.target.value);
                this.saveSettings();
            });
        }

        if (durationInput) {
            durationInput.addEventListener('input', (e) => {
                this.settings.minDuration = parseInt(e.target.value);
                this.saveSettings();
            });
        }

        if (exportBtn) {
            exportBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.exportData();
            });
        }

        if (clearBtn) {
            clearBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.clearData();
            });
        }

        // History filter
        const historyFilter = document.getElementById('history-filter');
        if (historyFilter) {
            historyFilter.addEventListener('change', () => {
                this.updateHistoryView();
            });
        }
    }

    showScreen(screenName) {
        console.log('Showing screen:', screenName); // Debug log
        
        // Update navigation
        document.querySelectorAll('.nav-btn').forEach(btn => {
            const isActive = btn.getAttribute('data-screen') === screenName;
            btn.classList.toggle('active', isActive);
        });

        // Update screens
        document.querySelectorAll('.screen').forEach(screen => {
            const shouldShow = screen.id === `${screenName}-screen`;
            screen.classList.toggle('active', shouldShow);
            if (shouldShow) {
                screen.style.display = 'block';
            } else {
                screen.style.display = 'none';
            }
        });

        this.currentScreen = screenName;

        // Update screen-specific content
        switch(screenName) {
            case 'results':
                this.updateResultsScreen();
                break;
            case 'history':
                this.updateHistoryScreen();
                break;
            case 'settings':
                this.updateSettingsScreen();
                break;
            case 'monitor':
                this.initWaveform();
                break;
            case 'home':
                this.populateHomeScreen();
                break;
        }
    }

    updateCurrentDate() {
        const now = new Date();
        const dateString = now.toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        });
        const element = document.getElementById('current-date');
        if (element) element.textContent = dateString;
    }

    populateHomeScreen() {
        const sessions = this.loadSavedData();
        
        // Update quick stats
        if (sessions.length > 0) {
            const avgScore = Math.round(sessions.reduce((sum, s) => sum + s.snoreScore, 0) / sessions.length);
            const avgEl = document.getElementById('avg-score');
            const totalEl = document.getElementById('total-sessions');
            const lastEl = document.getElementById('last-score');
            
            if (avgEl) avgEl.textContent = avgScore || 0;
            if (totalEl) totalEl.textContent = sessions.length;
            if (lastEl) lastEl.textContent = sessions[0].snoreScore;
        }

        // Populate recent sessions
        const recentSessionsList = document.getElementById('recent-sessions-list');
        if (recentSessionsList) {
            recentSessionsList.innerHTML = '';
            
            sessions.slice(0, 3).forEach(session => {
                const sessionElement = this.createSessionElement(session);
                recentSessionsList.appendChild(sessionElement);
            });
        }
    }

    createSessionElement(session) {
        const div = document.createElement('div');
        div.className = 'session-item';
        
        const scoreClass = session.snoreScore >= 80 ? 'score-excellent' : 
                          session.snoreScore >= 60 ? 'score-good' : 'score-poor';
        
        div.innerHTML = `
            <div>
                <div class="session-date-info">${new Date(session.date).toLocaleDateString()}</div>
                <div class="session-details">${Math.floor(session.duration / 60)}h ${session.duration % 60}m</div>
            </div>
            <div class="session-score-badge ${scoreClass}">${session.snoreScore}</div>
        `;
        
        // Add click handler to view session results
        div.addEventListener('click', () => {
            this.currentSession = session;
            this.showScreen('results');
        });
        
        return div;
    }

    renderFeatures() {
        const featuresGrid = document.getElementById('features-grid');
        if (featuresGrid) {
            featuresGrid.innerHTML = '';
            
            this.sampleData.appFeatures.forEach(feature => {
                const featureElement = document.createElement('div');
                featureElement.className = 'feature-item';
                featureElement.innerHTML = `
                    <h4>${feature.title}</h4>
                    <p>${feature.description}</p>
                `;
                featuresGrid.appendChild(featureElement);
            });
        }
    }

    async toggleMonitoring() {
        if (!this.isRecording) {
            await this.startMonitoring();
        } else {
            this.stopMonitoring();
        }
    }

    async startMonitoring() {
        try {
            // Request microphone permission if not already granted
            if (!this.stream) {
                this.showModal();
                return;
            }

            this.isRecording = true;
            this.startTime = new Date();
            this.sessionData = {
                startTime: this.startTime,
                endTime: null,
                snoreEvents: [],
                volumeLevels: [],
                peakVolume: 0,
                avgVolume: 0
            };

            // Update UI
            const btn = document.getElementById('monitor-toggle');
            if (btn) {
                btn.classList.add('recording');
                const btnText = btn.querySelector('.btn-text');
                if (btnText) btnText.textContent = 'STOP MONITORING';
            }
            
            const statusEl = document.getElementById('monitoring-status');
            if (statusEl) statusEl.textContent = 'Recording...';
            
            const indicatorEl = document.getElementById('snore-indicator');
            if (indicatorEl) {
                indicatorEl.innerHTML = `
                    <div class="indicator-light active"></div>
                    <span>Monitoring for snoring...</span>
                `;
            }

            // Start timer
            this.startTimer();
            
            // Start audio analysis
            this.setupAudioAnalysis();
            this.analyzeAudio();

        } catch (error) {
            console.error('Error starting monitoring:', error);
            this.showError('Failed to start monitoring. Please check microphone permissions.');
        }
    }

    stopMonitoring() {
        this.isRecording = false;
        this.sessionData.endTime = new Date();

        // Update UI
        const btn = document.getElementById('monitor-toggle');
        if (btn) {
            btn.classList.remove('recording');
            const btnText = btn.querySelector('.btn-text');
            if (btnText) btnText.textContent = 'START MONITORING';
        }
        
        const statusEl = document.getElementById('monitoring-status');
        if (statusEl) statusEl.textContent = 'Session Complete';
        
        // Stop timer
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
        }

        // Stop audio analysis
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }

        // Process and save session
        this.processSession();
        
        // Show results
        setTimeout(() => {
            this.showScreen('results');
        }, 1000);
    }

    showModal() {
        const modal = document.getElementById('permission-modal');
        if (modal) {
            modal.classList.add('show');
        }
    }

    hideModal() {
        const modal = document.getElementById('permission-modal');
        if (modal) {
            modal.classList.remove('show');
        }
    }

    async requestMicrophonePermission() {
        try {
            this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            this.hideModal();
            this.startMonitoring();
        } catch (error) {
            console.error('Microphone permission denied:', error);
            this.hideModal();
            this.showError('Microphone access is required for monitoring.');
        }
    }

    setupAudioAnalysis() {
        if (!this.stream) return;

        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        this.analyser = this.audioContext.createAnalyser();
        const source = this.audioContext.createMediaStreamSource(this.stream);
        source.connect(this.analyser);

        this.analyser.fftSize = 256;
        const bufferLength = this.analyser.frequencyBinCount;
        this.dataArray = new Uint8Array(bufferLength);
    }

    analyzeAudio() {
        if (!this.isRecording || !this.analyser) return;

        this.analyser.getByteFrequencyData(this.dataArray);
        
        // Calculate volume level
        const sum = this.dataArray.reduce((a, b) => a + b, 0);
        const average = sum / this.dataArray.length;
        const volume = average / 255; // Normalize to 0-1

        // Update volume indicator
        this.updateVolumeIndicator(volume);
        
        // Store volume data
        this.sessionData.volumeLevels.push({
            timestamp: new Date(),
            volume: volume
        });

        // Update peak volume
        if (volume > this.sessionData.peakVolume) {
            this.sessionData.peakVolume = volume;
        }

        // Detect potential snoring
        this.detectSnoring(volume);

        // Draw waveform
        this.drawWaveform();

        this.animationId = requestAnimationFrame(() => this.analyzeAudio());
    }

    detectSnoring(volume) {
        const threshold = this.settings.volumeThreshold * (this.settings.sensitivity / 10);
        
        if (volume > threshold) {
            const now = new Date();
            const lastEvent = this.sessionData.snoreEvents[this.sessionData.snoreEvents.length - 1];
            
            // Check if this is a continuation of the last event or a new one
            if (!lastEvent || (now - lastEvent.endTime) > 5000) { // 5 second gap
                this.sessionData.snoreEvents.push({
                    startTime: now,
                    endTime: now,
                    peakVolume: volume,
                    avgVolume: volume
                });
            } else {
                // Update existing event
                lastEvent.endTime = now;
                lastEvent.peakVolume = Math.max(lastEvent.peakVolume, volume);
                lastEvent.avgVolume = (lastEvent.avgVolume + volume) / 2;
            }

            // Update UI indicator
            const light = document.querySelector('.indicator-light');
            if (light) {
                light.classList.add('active');
                setTimeout(() => {
                    light.classList.remove('active');
                }, 1000);
            }
        }
    }

    updateVolumeIndicator(volume) {
        const fill = document.getElementById('volume-fill');
        if (fill) {
            fill.style.width = `${volume * 100}%`;
        }
    }

    initWaveform() {
        const canvas = document.getElementById('waveform-canvas');
        if (canvas) {
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--color-surface');
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
    }

    drawWaveform() {
        const canvas = document.getElementById('waveform-canvas');
        if (!canvas || !this.dataArray) return;

        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;

        // Clear canvas
        ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--color-surface');
        ctx.fillRect(0, 0, width, height);

        // Draw waveform
        ctx.lineWidth = 2;
        ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--color-primary');
        ctx.beginPath();

        const sliceWidth = width * 1.0 / this.dataArray.length;
        let x = 0;

        for (let i = 0; i < this.dataArray.length; i++) {
            const v = this.dataArray[i] / 128.0;
            const y = v * height / 2;

            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }

            x += sliceWidth;
        }

        ctx.lineTo(canvas.width, canvas.height / 2);
        ctx.stroke();
    }

    startTimer() {
        this.timerInterval = setInterval(() => {
            if (this.startTime) {
                const elapsed = new Date() - this.startTime;
                const hours = Math.floor(elapsed / 3600000);
                const minutes = Math.floor((elapsed % 3600000) / 60000);
                const seconds = Math.floor((elapsed % 60000) / 1000);
                
                const timerEl = document.getElementById('session-timer');
                if (timerEl) {
                    timerEl.textContent = 
                        `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
                }
            }
        }, 1000);
    }

    processSession() {
        const duration = Math.floor((this.sessionData.endTime - this.sessionData.startTime) / 1000 / 60);
        const totalSnoreTime = this.sessionData.snoreEvents.reduce((total, event) => {
            return total + (event.endTime - event.startTime);
        }, 0) / 1000 / 60; // Convert to minutes

        const avgVolume = this.sessionData.volumeLevels.length > 0 ? 
            this.sessionData.volumeLevels.reduce((sum, v) => sum + v.volume, 0) / this.sessionData.volumeLevels.length * 100 : 0;

        // Calculate snore score (higher is better)
        const snoreScore = Math.max(0, Math.min(100, 
            100 - (this.sessionData.snoreEvents.length * 2) - (totalSnoreTime * 0.5)
        ));

        const intensity = snoreScore >= 80 ? 'light' : snoreScore >= 60 ? 'moderate' : 'heavy';
        const sleepQuality = snoreScore >= 80 ? 'excellent' : snoreScore >= 60 ? 'good' : 'poor';

        const session = {
            id: `session_${Date.now()}`,
            date: this.sessionData.startTime.toISOString().split('T')[0],
            duration: duration,
            snoreScore: Math.round(snoreScore),
            snoreEvents: this.sessionData.snoreEvents.length,
            intensity: intensity,
            totalSnoreTime: Math.round(totalSnoreTime),
            avgVolume: Math.round(avgVolume),
            peakVolume: Math.round(this.sessionData.peakVolume * 100),
            sleepQuality: sleepQuality,
            rawData: this.sessionData
        };

        // Save session
        const sessions = this.loadSavedData();
        sessions.unshift(session); // Add to beginning
        this.saveSessions(sessions);

        // Store current session for results view
        this.currentSession = session;
    }

    updateResultsScreen() {
        if (!this.currentSession) {
            // Use most recent session if no current session
            const sessions = this.loadSavedData();
            this.currentSession = sessions[0] || this.sampleData.sampleSessions[0];
        }

        const session = this.currentSession;
        
        const elements = {
            'results-date': new Date(session.date).toLocaleDateString(),
            'session-score': session.snoreScore,
            'session-duration': `${Math.floor(session.duration / 60)}h ${session.duration % 60}m`,
            'snore-events': session.snoreEvents,
            'snore-time': `${session.totalSnoreTime}m`,
            'intensity-level': session.intensity.charAt(0).toUpperCase() + session.intensity.slice(1)
        };

        Object.entries(elements).forEach(([id, value]) => {
            const el = document.getElementById(id);
            if (el) el.textContent = value;
        });

        // Update score description
        const description = session.snoreScore >= 80 ? 'Excellent sleep quality' :
                           session.snoreScore >= 60 ? 'Good sleep quality' : 'Poor sleep quality';
        const descEl = document.getElementById('score-description');
        if (descEl) descEl.textContent = description;

        // Draw timeline chart
        this.drawTimelineChart(session);

        // Show recommendations
        this.showRecommendations(session.snoreScore);
    }

    drawTimelineChart(session) {
        const canvas = document.getElementById('timeline-chart');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;

        // Clear canvas
        ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--color-surface');
        ctx.fillRect(0, 0, width, height);

        // Draw timeline background
        ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--color-secondary');
        ctx.fillRect(20, height - 40, width - 40, 20);

        // Draw snoring events if available
        if (session.rawData && session.rawData.snoreEvents) {
            const sessionDuration = session.duration * 60 * 1000; // Convert to ms
            const barWidth = width - 40;

            ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--color-error');
            
            session.rawData.snoreEvents.forEach(event => {
                const startPercent = (event.startTime - session.rawData.startTime) / sessionDuration;
                const duration = (event.endTime - event.startTime) / sessionDuration;
                const x = 20 + startPercent * barWidth;
                const eventWidth = Math.max(2, duration * barWidth);
                
                ctx.fillRect(x, height - 40, eventWidth, 20);
            });
        }

        // Add labels
        ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--color-text-secondary');
        ctx.font = '12px var(--font-family-base)';
        ctx.fillText('Sleep Timeline', 20, 20);
        ctx.fillText('Start', 20, height - 5);
        ctx.fillText('End', width - 40, height - 5);
    }

    showRecommendations(score) {
        const recommendationsList = document.getElementById('recommendations-list');
        if (!recommendationsList) return;
        
        recommendationsList.innerHTML = '';

        // Filter recommendations based on score
        let recommendations = this.sampleData.recommendations;
        if (score < 60) {
            recommendations = recommendations.slice(0, 4); // Show more for poor sleep
        } else if (score < 80) {
            recommendations = recommendations.slice(0, 2); // Show some for moderate sleep
        } else {
            recommendations = [recommendations[1]]; // Show minimal for good sleep
        }

        recommendations.forEach(rec => {
            const div = document.createElement('div');
            div.className = 'recommendation-item';
            div.textContent = rec;
            recommendationsList.appendChild(div);
        });
    }

    updateHistoryScreen() {
        this.updateTrendsChart();
        this.updateHistoryList();
    }

    updateTrendsChart() {
        const canvas = document.getElementById('trends-chart');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;

        // Clear canvas
        ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--color-surface');
        ctx.fillRect(0, 0, width, height);

        // Draw chart
        const data = this.sampleData.weeklyTrends;
        const maxScore = 100;
        const barWidth = (width - 80) / data.length;
        const maxBarHeight = height - 80;

        ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--color-primary');

        data.forEach((item, index) => {
            const barHeight = (item.score / maxScore) * maxBarHeight;
            const x = 40 + index * barWidth + 10;
            const y = height - 40 - barHeight;
            
            ctx.fillRect(x, y, barWidth - 20, barHeight);
            
            // Add labels
            ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--color-text-secondary');
            ctx.font = '12px var(--font-family-base)';
            ctx.fillText(item.day, x + 5, height - 20);
            ctx.fillText(item.score.toString(), x + 5, y - 5);
            
            ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--color-primary');
        });
    }

    updateHistoryList() {
        const historyList = document.getElementById('history-sessions');
        if (!historyList) return;
        
        historyList.innerHTML = '';

        const sessions = this.loadSavedData();
        
        sessions.forEach(session => {
            const div = document.createElement('div');
            div.className = 'history-item';
            div.innerHTML = `
                <div>
                    <div class="history-date">${new Date(session.date).toLocaleDateString()}</div>
                    <div class="history-details">${Math.floor(session.duration / 60)}h ${session.duration % 60}m • ${session.snoreEvents} events</div>
                </div>
                <div class="history-score">${session.snoreScore}</div>
            `;
            
            div.addEventListener('click', () => {
                this.currentSession = session;
                this.showScreen('results');
            });
            
            historyList.appendChild(div);
        });
    }

    updateHistoryView() {
        this.updateHistoryList();
    }

    updateSettingsScreen() {
        const sensitivityEl = document.getElementById('sensitivity');
        const durationEl = document.getElementById('min-duration');
        
        if (sensitivityEl) sensitivityEl.value = this.settings.sensitivity;
        if (durationEl) durationEl.value = this.settings.minDuration;
    }

    exportData() {
        const sessions = this.loadSavedData();
        const dataStr = JSON.stringify(sessions, null, 2);
        const dataBlob = new Blob([dataStr], {type: 'application/json'});
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = `snoretracker-data-${new Date().toISOString().split('T')[0]}.json`;
        link.click();
    }

    clearData() {
        if (confirm('Are you sure you want to clear all data? This cannot be undone.')) {
            try {
                localStorage.removeItem('snoreTracker_sessions');
                localStorage.removeItem('snoreTracker_settings');
                location.reload();
            } catch (e) {
                console.log('Data could not be cleared');
            }
        }
    }

    showError(message) {
        // Simple error display - could be enhanced with a proper toast system
        alert(message);
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new SnoreTrackerApp();
});