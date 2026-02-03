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
        this.activityPanel = null;

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
        // Activity Panel (real-time operation display)
        this.activityPanel = new ActivityPanel('activity-panel-container');

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
        // Store reference for closures
        const activityPanel = this.activityPanel;
        const eventLog = this.eventLog;
        const pageRenderer = this.pageRenderer;
        const diskVisualizer = this.diskVisualizer;
        const effectsManager = this.effectsManager;
        const simulation = this.simulation;
        const kpiDashboard = this.kpiDashboard;

        // Page allocated to RAM
        this.simulation.on('onPageAllocated', (page, frame) => {
            pageRenderer.addPageToRAM(page, frame, true);
        });

        // Page evicted (before swap out)
        this.simulation.on('onPageEvicted', (page, frame) => {
            const policyName = simulation.policy.getName();
            eventLog.logSwapOut(page, policyName);

            // Update activity panel with policy decision
            let victimReason = '';
            if (policyName === 'FIFO') {
                victimReason = 'Oldest page in RAM (first loaded)';
            } else if (policyName === 'LRU') {
                victimReason = 'Least recently accessed page';
            }
            activityPanel.showPolicyDecision(policyName, page, victimReason);
        });

        // Page swapped out to disk
        this.simulation.on('onPageSwappedOut', (page, block) => {
            const frame = simulation.frames.find(f => f.page === page);
            const policyName = simulation.policy.getName();
            let victimReason = policyName === 'FIFO' ? 'First-In-First-Out' : 'Least Recently Used';

            // Update activity panel
            activityPanel.showSwapOut(page, victimReason, policyName, block ? block.id : null);

            if (frame) {
                pageRenderer.animateSwapOut(page, frame, block);
            } else {
                // Direct allocation to disk
                pageRenderer.addPageToDisk(page, block, true);
            }
            diskVisualizer.startSpin();

            // Clear after animation
            activityPanel.clearSwapOut();
        });

        // Page swapped in from disk
        this.simulation.on('onPageSwappedIn', (page) => {
            eventLog.logSwapIn(page);

            // Show swap in on activity panel
            const targetFrame = simulation.frames.find(f => f.page === page);
            activityPanel.showSwapIn(page, page.diskBlockId, targetFrame ? targetFrame.id : null);
            activityPanel.clearSwapIn();
        });

        // Page accessed
        this.simulation.on('onPageAccessed', (page, result) => {
            pageRenderer.highlightPage(page.id);

            // Update activity panel
            const isHit = result === 'hit';
            activityPanel.showPageAccess(page, isHit);

            if (isHit) {
                activityPanel.clearFault();
            }
        });

        // Page fault
        this.simulation.on('onPageFault', (page) => {
            eventLog.logPageFault(page);
            activityPanel.showPageFault(page);

            const mesh = pageRenderer.getPageMesh(page.id);
            if (mesh) {
                effectsManager.createPageFaultFlash(mesh.position);
            }
        });

        // Thrashing state change
        this.simulation.on('onThrashingChange', (isThrashing) => {
            eventLog.logThrashing(isThrashing);
            if (isThrashing) {
                effectsManager.activateThrashing();
            } else {
                effectsManager.deactivateThrashing();
            }
        });

        // Stats update
        this.simulation.on('onStatsUpdate', (stats) => {
            kpiDashboard.update(stats);
        });

        // Process added
        this.simulation.on('onProcessAdded', (process) => {
            eventLog.logProcessAdded(process);
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
        this.activityPanel.reset();
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
