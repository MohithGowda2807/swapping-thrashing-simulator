/**
 * Controls - UI controls for simulation playback and parameters
 */
class Controls {
    constructor(containerId, callbacks = {}) {
        this.container = document.getElementById(containerId);
        this.callbacks = callbacks;

        this.isPlaying = false;
        this.speed = 1.0;
        this.intensity = 1.0;

        this.createControls();
        this.attachEventListeners();
    }

    /**
     * Create control elements
     */
    createControls() {
        if (!this.container) return;

        this.container.innerHTML = `
            <div class="controls-section">
                <h3 class="section-title">Playback Controls</h3>
                <div class="playback-controls">
                    <button class="btn btn-primary" id="btn-play" title="Play/Pause (Space)">
                        <span class="btn-icon">▶️</span>
                        <span class="btn-text">Play</span>
                    </button>
                    <button class="btn btn-secondary" id="btn-step" title="Single Step (→)">
                        <span class="btn-icon">⏭️</span>
                        <span class="btn-text">Step</span>
                    </button>
                    <button class="btn btn-secondary" id="btn-reset" title="Reset (R)">
                        <span class="btn-icon">🔄</span>
                        <span class="btn-text">Reset</span>
                    </button>
                </div>
            </div>
            
            <div class="controls-section">
                <h3 class="section-title">Simulation Speed</h3>
                <div class="slider-control">
                    <input type="range" id="speed-slider" min="0.1" max="5" step="0.1" value="1">
                    <div class="slider-labels">
                        <span>0.1x</span>
                        <span id="speed-value">1.0x</span>
                        <span>5x</span>
                    </div>
                </div>
            </div>
            
            <div class="controls-section">
                <h3 class="section-title">Workload Intensity</h3>
                <div class="slider-control">
                    <input type="range" id="intensity-slider" min="0.5" max="5" step="0.5" value="1">
                    <div class="slider-labels">
                        <span>Low</span>
                        <span id="intensity-value">1.0</span>
                        <span>High</span>
                    </div>
                </div>
            </div>
            
            <div class="controls-section">
                <h3 class="section-title">Configuration</h3>
                <div class="config-grid">
                    <div class="config-item">
                        <label for="config-ram">RAM Frames</label>
                        <input type="number" id="config-ram" value="32" min="8" max="128" step="8">
                    </div>
                    <div class="config-item">
                        <label for="config-swap">Swap Blocks</label>
                        <input type="number" id="config-swap" value="64" min="16" max="256" step="16">
                    </div>
                    <div class="config-item">
                        <label for="config-policy">Policy</label>
                        <select id="config-policy">
                            <option value="LRU" selected>LRU</option>
                            <option value="FIFO">FIFO</option>
                        </select>
                    </div>
                </div>
                <button class="btn btn-primary full-width" id="btn-apply-config">
                    Apply Configuration
                </button>
            </div>
            
            <div class="controls-section">
                <h3 class="section-title">View Controls</h3>
                <div class="view-controls">
                    <button class="btn btn-secondary" id="btn-reset-camera" title="Reset Camera">
                        📷 Camera
                    </button>
                    <button class="btn btn-secondary" id="btn-toggle-labels" title="Toggle Labels">
                        🏷️ Labels
                    </button>
                    <button class="btn btn-secondary" id="btn-toggle-particles" title="Toggle Particles">
                        ✨ Effects
                    </button>
                </div>
            </div>
        `;

        // Cache DOM references
        this.elements = {
            playBtn: document.getElementById('btn-play'),
            stepBtn: document.getElementById('btn-step'),
            resetBtn: document.getElementById('btn-reset'),
            speedSlider: document.getElementById('speed-slider'),
            speedValue: document.getElementById('speed-value'),
            intensitySlider: document.getElementById('intensity-slider'),
            intensityValue: document.getElementById('intensity-value'),
            ramInput: document.getElementById('config-ram'),
            swapInput: document.getElementById('config-swap'),
            policySelect: document.getElementById('config-policy'),
            applyConfigBtn: document.getElementById('btn-apply-config'),
            resetCameraBtn: document.getElementById('btn-reset-camera'),
            toggleLabelsBtn: document.getElementById('btn-toggle-labels'),
            toggleParticlesBtn: document.getElementById('btn-toggle-particles')
        };
    }

    /**
     * Attach event listeners
     */
    attachEventListeners() {
        if (!this.elements.playBtn) return;

        // Play/Pause
        this.elements.playBtn.addEventListener('click', () => this.togglePlay());

        // Step
        this.elements.stepBtn.addEventListener('click', () => {
            if (this.callbacks.onStep) this.callbacks.onStep();
        });

        // Reset
        this.elements.resetBtn.addEventListener('click', () => {
            if (this.callbacks.onReset) this.callbacks.onReset();
            this.setPlaying(false);
        });

        // Speed slider
        this.elements.speedSlider.addEventListener('input', (e) => {
            this.speed = parseFloat(e.target.value);
            this.elements.speedValue.textContent = this.speed.toFixed(1) + 'x';
            if (this.callbacks.onSpeedChange) this.callbacks.onSpeedChange(this.speed);
        });

        // Intensity slider
        this.elements.intensitySlider.addEventListener('input', (e) => {
            this.intensity = parseFloat(e.target.value);
            this.elements.intensityValue.textContent = this.intensity.toFixed(1);
            if (this.callbacks.onIntensityChange) this.callbacks.onIntensityChange(this.intensity);
        });

        // Apply config
        this.elements.applyConfigBtn.addEventListener('click', () => {
            const config = {
                ramFrames: parseInt(this.elements.ramInput.value),
                swapBlocks: parseInt(this.elements.swapInput.value),
                policy: this.elements.policySelect.value
            };
            if (this.callbacks.onConfigChange) this.callbacks.onConfigChange(config);
        });

        // View controls
        this.elements.resetCameraBtn.addEventListener('click', () => {
            if (this.callbacks.onResetCamera) this.callbacks.onResetCamera();
        });

        this.elements.toggleLabelsBtn.addEventListener('click', () => {
            if (this.callbacks.onToggleLabels) this.callbacks.onToggleLabels();
        });

        this.elements.toggleParticlesBtn.addEventListener('click', () => {
            if (this.callbacks.onToggleParticles) this.callbacks.onToggleParticles();
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => this.handleKeyboard(e));
    }

    /**
     * Handle keyboard shortcuts
     */
    handleKeyboard(e) {
        // Ignore if typing in input
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;

        switch (e.code) {
            case 'Space':
                e.preventDefault();
                this.togglePlay();
                break;
            case 'ArrowRight':
                e.preventDefault();
                if (this.callbacks.onStep) this.callbacks.onStep();
                break;
            case 'KeyR':
                e.preventDefault();
                if (this.callbacks.onReset) this.callbacks.onReset();
                this.setPlaying(false);
                break;
            case 'Digit1':
                if (this.callbacks.onQuickScenario) this.callbacks.onQuickScenario('light');
                break;
            case 'Digit2':
                if (this.callbacks.onQuickScenario) this.callbacks.onQuickScenario('balanced');
                break;
            case 'Digit3':
                if (this.callbacks.onQuickScenario) this.callbacks.onQuickScenario('heavy');
                break;
        }
    }

    /**
     * Toggle play/pause
     */
    togglePlay() {
        this.isPlaying = !this.isPlaying;
        this.updatePlayButton();

        if (this.isPlaying) {
            if (this.callbacks.onPlay) this.callbacks.onPlay();
        } else {
            if (this.callbacks.onPause) this.callbacks.onPause();
        }
    }

    /**
     * Set playing state
     */
    setPlaying(playing) {
        this.isPlaying = playing;
        this.updatePlayButton();
    }

    /**
     * Update play button appearance
     */
    updatePlayButton() {
        if (!this.elements.playBtn) return;

        const icon = this.elements.playBtn.querySelector('.btn-icon');
        const text = this.elements.playBtn.querySelector('.btn-text');

        if (this.isPlaying) {
            icon.textContent = '⏸️';
            text.textContent = 'Pause';
        } else {
            icon.textContent = '▶️';
            text.textContent = 'Play';
        }
    }

    /**
     * Set configuration values
     */
    setConfig(config) {
        if (config.ramFrames) this.elements.ramInput.value = config.ramFrames;
        if (config.swapBlocks) this.elements.swapInput.value = config.swapBlocks;
        if (config.policy) this.elements.policySelect.value = config.policy;
    }

    /**
     * Get current configuration
     */
    getConfig() {
        return {
            ramFrames: parseInt(this.elements.ramInput.value),
            swapBlocks: parseInt(this.elements.swapInput.value),
            policy: this.elements.policySelect.value
        };
    }
}

// Export for browser
if (typeof window !== 'undefined') {
    window.Controls = Controls;
}
