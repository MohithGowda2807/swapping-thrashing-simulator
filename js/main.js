/**
 * Main Application - Orchestrates all components
 * Exposes public API: loadScenario(), play(), pause(), step(), reset()
 */
class ThrashingVisualizer {
    constructor() {
        // Core components
        this.simulation = null;
        this.sceneManager = null;
        this.ramVisualizer = null;
        this.diskVisualizer = null;
        this.pageRenderer = null;
        this.effectsManager = null;

        // UI components
        this.kpiDashboard = null;
        this.controls = null;
        this.eventLog = null;
        this.scenarioSelector = null;

        // State
        this.isInitialized = false;

        this.initialize();
    }

    /**
     * Initialize all components
     */
    initialize() {
        console.log('Initializing Thrashing Visualizer...');

        // Initialize simulation engine
        this.simulation = new SimulationEngine();

        // Initialize 3D scene
        this.sceneManager = new SceneManager('visualization-container');

        // Initialize memory visualizers
        this.ramVisualizer = new RAMVisualizer(
            this.sceneManager.getScene(),
            { ramFrames: this.simulation.config.ramFrames }
        );

        this.diskVisualizer = new DiskVisualizer(
            this.sceneManager.getScene(),
            { swapBlocks: this.simulation.config.swapBlocks }
        );

        // Initialize page renderer
        this.pageRenderer = new PageRenderer(
            this.sceneManager.getScene(),
            this.ramVisualizer,
            this.diskVisualizer
        );

        // Initialize effects
        this.effectsManager = new EffectsManager(this.sceneManager.getScene());
        this.effectsManager.setCamera(this.sceneManager.camera);

        // Assign to scene manager for updates
        this.sceneManager.ramVisualizer = this.ramVisualizer;
        this.sceneManager.diskVisualizer = this.diskVisualizer;
        this.sceneManager.effectsManager = this.effectsManager;

        // Initialize UI
        this.initializeUI();

        // Setup simulation callbacks
        this.setupSimulationCallbacks();

        this.isInitialized = true;
        console.log('Thrashing Visualizer initialized successfully!');
    }

    /**
     * Initialize UI components
     */
    initializeUI() {
        // KPI Dashboard
        this.kpiDashboard = new KPIDashboard('kpi-container');

        // Event Log
        this.eventLog = new EventLog('event-log-container');

        // Controls
        this.controls = new Controls('controls-container', {
            onPlay: () => this.play(),
            onPause: () => this.pause(),
            onStep: () => this.step(),
            onReset: () => this.reset(),
            onSpeedChange: (speed) => this.simulation.setSpeed(speed),
            onIntensityChange: (intensity) => this.simulation.setIntensity(intensity),
            onConfigChange: (config) => this.applyConfiguration(config),
            onResetCamera: () => this.sceneManager.resetCamera(),
            onToggleLabels: () => this.sceneManager.toggleLabels(),
            onToggleParticles: () => this.effectsManager.toggleParticles(),
            onQuickScenario: (id) => this.loadScenario(getScenario(id))
        });

        // Scenario Selector
        this.scenarioSelector = new ScenarioSelector('scenario-container', {
            onScenarioLoad: (scenario) => this.loadScenario(scenario),
            onAddProcess: (name, pages, options) => this.addProcess(name, pages, options)
        });
    }

    /**
     * Setup simulation event callbacks
     */
    setupSimulationCallbacks() {
        // Page allocated to RAM
        this.simulation.on('onPageAllocated', (page, frame) => {
            this.pageRenderer.addPageToRAM(page, frame, true);
        });

        // Page evicted
        this.simulation.on('onPageEvicted', (page, frame) => {
            this.eventLog.logSwapOut(page, this.simulation.policy.getName());
        });

        // Page swapped out to disk
        this.simulation.on('onPageSwappedOut', (page, block) => {
            const frame = this.simulation.frames.find(f => f.page === page);
            if (frame) {
                this.pageRenderer.animateSwapOut(page, frame, block);
            } else {
                // Direct allocation to disk
                this.pageRenderer.addPageToDisk(page, block, true);
            }
            this.diskVisualizer.startSpin();
        });

        // Page swapped in from disk
        this.simulation.on('onPageSwappedIn', (page) => {
            this.eventLog.logSwapIn(page);
        });

        // Page accessed
        this.simulation.on('onPageAccessed', (page, result) => {
            this.pageRenderer.highlightPage(page.id);
        });

        // Page fault
        this.simulation.on('onPageFault', (page) => {
            this.eventLog.logPageFault(page);
            const mesh = this.pageRenderer.getPageMesh(page.id);
            if (mesh) {
                this.effectsManager.createPageFaultFlash(mesh.position);
            }
        });

        // Thrashing state change
        this.simulation.on('onThrashingChange', (isThrashing) => {
            this.eventLog.logThrashing(isThrashing);
            if (isThrashing) {
                this.effectsManager.activateThrashing();
            } else {
                this.effectsManager.deactivateThrashing();
            }
        });

        // Stats update
        this.simulation.on('onStatsUpdate', (stats) => {
            this.kpiDashboard.update(stats);
        });

        // Process added
        this.simulation.on('onProcessAdded', (process) => {
            this.eventLog.logProcessAdded(process);
        });
    }

    /**
     * Apply new configuration
     */
    applyConfiguration(config) {
        // Reset first
        this.reset();

        // Update simulation
        this.simulation.updateConfig(config);

        // Update visualizers
        this.ramVisualizer.resize(config.ramFrames);
        this.diskVisualizer.resize(config.swapBlocks);

        // Clear page renderer
        this.pageRenderer.clear();

        this.eventLog.log(`Configuration applied: ${config.ramFrames} frames, ${config.swapBlocks} blocks, ${config.policy}`, 'success');
    }

    /**
     * Add a process
     */
    addProcess(name, pages, options = {}) {
        return this.simulation.addProcess(name, pages, options);
    }

    // ==================== PUBLIC API ====================

    /**
     * Load a scenario
     * @param {Object|string} scenario - Scenario object or scenario ID
     */
    loadScenario(scenario) {
        if (typeof scenario === 'string') {
            scenario = getScenario(scenario);
        }

        // Reset first
        this.reset();

        // Apply configuration
        this.applyConfiguration(scenario.config);

        // Load scenario into simulation
        this.simulation.loadScenario(scenario);

        // Update controls
        this.controls.setConfig(scenario.config);

        // Log
        this.eventLog.logScenarioLoaded(scenario);

        return this;
    }

    /**
     * Start simulation playback
     */
    play() {
        this.simulation.play();
        this.controls.setPlaying(true);
        this.eventLog.logSimulationStart();
        return this;
    }

    /**
     * Pause simulation
     */
    pause() {
        this.simulation.pause();
        this.controls.setPlaying(false);
        this.eventLog.logSimulationPause();
        return this;
    }

    /**
     * Execute single step
     */
    step() {
        this.simulation.step();
        return this;
    }

    /**
     * Reset simulation
     */
    reset() {
        this.simulation.reset();
        this.pageRenderer.clear();
        this.effectsManager.deactivateThrashing();
        this.kpiDashboard.reset();
        this.controls.setPlaying(false);
        this.eventLog.logSimulationReset();
        return this;
    }

    /**
     * Get current statistics
     */
    getStats() {
        return this.simulation.getStats();
    }

    /**
     * Set simulation speed
     * @param {number} speed - Speed multiplier (0.1 to 10)
     */
    setSpeed(speed) {
        this.simulation.setSpeed(speed);
        return this;
    }

    /**
     * Set workload intensity
     * @param {number} intensity - Intensity multiplier
     */
    setIntensity(intensity) {
        this.simulation.setIntensity(intensity);
        return this;
    }
}

// ==================== INITIALIZATION ====================

// Global instance
let visualizer = null;

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    visualizer = new ThrashingVisualizer();

    // Expose global API
    window.visualizer = visualizer;

    // Convenience functions
    window.loadScenario = (scenario) => visualizer.loadScenario(scenario);
    window.play = () => visualizer.play();
    window.pause = () => visualizer.pause();
    window.step = () => visualizer.step();
    window.reset = () => visualizer.reset();

    console.log('=================================');
    console.log('Thrashing 3D Visualizer Ready!');
    console.log('=================================');
    console.log('API Commands:');
    console.log('  loadScenario("light"|"balanced"|"heavy")');
    console.log('  play()');
    console.log('  pause()');
    console.log('  step()');
    console.log('  reset()');
    console.log('=================================');
});
