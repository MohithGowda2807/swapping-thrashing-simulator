/**
 * SimulationEngine - Main orchestrator for the memory simulation
 * Manages time, processes, memory, and dispatches events
 */
class SimulationEngine {
    constructor() {
        // Configuration
        this.config = {
            ramFrames: 32,
            swapBlocks: 64,
            pageSize: 4,
            accessInterval: 300,
            policy: 'LRU'
        };

        // Core components
        this.frames = [];           // Physical RAM frames
        this.freeFrames = [];       // Free frame list
        this.swapSystem = null;     // Swap subsystem
        this.policy = null;         // Current page replacement policy
        this.workloadGenerator = null;

        // State
        this.processes = [];
        this.allPages = new Map();  // pageId -> Page
        this.pageIdCounter = 0;

        // Simulation state
        this.isRunning = false;
        this.isPaused = false;
        this.simulationTime = 0;    // Logical time in ms
        this.speed = 1.0;           // Time multiplier
        this.animationFrameId = null;
        this.lastStepTime = 0;

        // Statistics
        this.stats = {
            totalPageFaults: 0,
            pageFaultsThisSecond: 0,
            pageFaultTimes: [],     // Timestamps of recent faults
            swapInCount: 0,
            swapOutCount: 0,
            memoryAccesses: 0,
            hitCount: 0
        };

        // Thrashing detection
        this.thrashingThreshold = 5;  // Swap ops per second to trigger thrashing
        this.isThrashing = false;

        // Event callbacks
        this.callbacks = {
            onPageAllocated: null,
            onPageEvicted: null,
            onPageSwappedIn: null,
            onPageSwappedOut: null,
            onPageAccessed: null,
            onPageFault: null,
            onThrashingChange: null,
            onStatsUpdate: null,
            onProcessAdded: null,
            onSimulationStep: null
        };

        this.initialize();
    }

    /**
     * Initialize the simulation
     */
    initialize() {
        this.initializeFrames();
        this.swapSystem = new SwapSystem(this.config.swapBlocks);
        this.workloadGenerator = new WorkloadGenerator();
        this.setPolicy(this.config.policy);
    }

    /**
     * Initialize RAM frames
     */
    initializeFrames() {
        this.frames = [];
        this.freeFrames = [];

        for (let i = 0; i < this.config.ramFrames; i++) {
            const frame = new Frame(i);
            // Calculate 3D grid position
            const cols = Math.ceil(Math.sqrt(this.config.ramFrames));
            frame.position = {
                x: (i % cols) - cols / 2,
                y: 0,
                z: Math.floor(i / cols) - cols / 2
            };
            this.frames.push(frame);
            this.freeFrames.push(frame);
        }
    }

    /**
     * Set the page replacement policy
     */
    setPolicy(policyName) {
        switch (policyName.toUpperCase()) {
            case 'FIFO':
                this.policy = new FIFO();
                break;
            case 'LRU':
            default:
                this.policy = new LRU();
                break;
        }
        this.config.policy = policyName;
    }

    /**
     * Update configuration
     */
    updateConfig(newConfig) {
        const needsReinit =
            newConfig.ramFrames !== this.config.ramFrames ||
            newConfig.swapBlocks !== this.config.swapBlocks;

        Object.assign(this.config, newConfig);

        if (needsReinit) {
            this.reset();
        }

        if (newConfig.policy) {
            this.setPolicy(newConfig.policy);
        }
    }

    /**
     * Add a process to the simulation
     */
    addProcess(name, pageCount, options = {}) {
        const processId = this.processes.length;
        const process = new Process(processId, name, pageCount, options);

        // Create pages
        const pages = process.createPages(this.pageIdCounter);
        this.pageIdCounter += pageCount;

        // Register pages
        pages.forEach(page => {
            this.allPages.set(page.id, page);
        });

        this.processes.push(process);
        this.workloadGenerator.setProcesses(this.processes);

        // Allocate initial pages to RAM
        this.allocateInitialPages(process);

        // Notify callback
        if (this.callbacks.onProcessAdded) {
            this.callbacks.onProcessAdded(process);
        }

        return process;
    }

    /**
     * Allocate initial pages of a process to RAM
     */
    allocateInitialPages(process) {
        for (const page of process.pages) {
            if (this.freeFrames.length > 0) {
                this.allocatePageToFrame(page);
            } else {
                // RAM full, need to allocate to swap
                const block = this.swapSystem.allocateBlock(page);
                if (block && this.callbacks.onPageSwappedOut) {
                    this.callbacks.onPageSwappedOut(page, block);
                }
            }
        }
    }

    /**
     * Allocate a page to a free frame
     */
    allocatePageToFrame(page) {
        if (this.freeFrames.length === 0) return false;

        const frame = this.freeFrames.shift();
        frame.allocate(page);
        page.moveToRAM(frame.id, this.simulationTime);

        // Update policy
        this.policy.onPageLoad(page, this.simulationTime);

        // Notify callback
        if (this.callbacks.onPageAllocated) {
            this.callbacks.onPageAllocated(page, frame);
        }

        return true;
    }

    /**
     * Access a page - core simulation step
     */
    accessPage(page) {
        if (!page) return;

        this.stats.memoryAccesses++;

        const process = this.processes.find(p => p.id === page.processId);
        if (process) {
            process.recordAccess();
        }

        if (page.location === 'ram') {
            // Page hit
            this.stats.hitCount++;
            this.policy.onPageAccess(page, this.simulationTime);

            if (this.callbacks.onPageAccessed) {
                this.callbacks.onPageAccessed(page, 'hit');
            }
        } else {
            // Page fault!
            this.handlePageFault(page);
        }
    }

    /**
     * Handle a page fault
     */
    handlePageFault(page) {
        // Record statistics
        this.stats.totalPageFaults++;
        this.stats.pageFaultTimes.push(Date.now());

        // Clean old fault times (keep last second)
        const now = Date.now();
        this.stats.pageFaultTimes = this.stats.pageFaultTimes.filter(
            t => now - t < 1000
        );
        this.stats.pageFaultsThisSecond = this.stats.pageFaultTimes.length;

        const process = this.processes.find(p => p.id === page.processId);
        if (process) {
            process.recordPageFault();
        }

        // Notify page fault
        if (this.callbacks.onPageFault) {
            this.callbacks.onPageFault(page);
        }

        // Need to bring page into RAM
        if (this.freeFrames.length === 0) {
            // RAM full - need to evict
            this.evictPage();
        }

        // Free the disk block if page was on disk
        if (page.location === 'disk' && page.diskBlockId !== null) {
            this.swapSystem.freeBlock(page.diskBlockId);
            this.stats.swapInCount++;

            if (this.callbacks.onPageSwappedIn) {
                this.callbacks.onPageSwappedIn(page);
            }
        }

        // Allocate page to RAM
        this.allocatePageToFrame(page);

        // Check thrashing
        this.checkThrashing();
    }

    /**
     * Evict a page using current policy
     */
    evictPage() {
        // Get pages in RAM
        const ramPages = [];
        this.frames.forEach(frame => {
            if (frame.page) {
                ramPages.push(frame.page);
            }
        });

        // Select victim
        const victim = this.policy.selectVictim(ramPages);
        if (!victim) return;

        // Find and free the frame
        const frame = this.frames[victim.frameId];
        if (frame) {
            frame.free();
            this.freeFrames.push(frame);
        }

        // Notify eviction
        if (this.callbacks.onPageEvicted) {
            this.callbacks.onPageEvicted(victim, frame);
        }

        // Notify policy
        if (this.policy.onEvict) {
            this.policy.onEvict(victim);
        }

        // Swap out to disk
        const block = this.swapSystem.allocateBlock(victim);
        this.stats.swapOutCount++;

        if (this.callbacks.onPageSwappedOut) {
            this.callbacks.onPageSwappedOut(victim, block);
        }
    }

    /**
     * Check for thrashing condition
     */
    checkThrashing() {
        const ioRate = this.swapSystem.getIORate();
        const wasThrashing = this.isThrashing;

        this.isThrashing = ioRate >= this.thrashingThreshold;

        if (wasThrashing !== this.isThrashing) {
            if (this.callbacks.onThrashingChange) {
                this.callbacks.onThrashingChange(this.isThrashing);
            }
        }
    }

    /**
     * Run one simulation step
     */
    step() {
        // Generate memory accesses
        const accesses = this.workloadGenerator.generateBatch(1);

        for (const access of accesses) {
            this.accessPage(access.page);
        }

        // Advance simulation time
        this.simulationTime += this.config.accessInterval;

        // Check thrashing
        this.checkThrashing();

        // Notify step complete
        if (this.callbacks.onSimulationStep) {
            this.callbacks.onSimulationStep(this.getStats());
        }

        // Notify stats update
        if (this.callbacks.onStatsUpdate) {
            this.callbacks.onStatsUpdate(this.getStats());
        }
    }

    /**
     * Start continuous simulation
     */
    play() {
        if (this.isRunning && !this.isPaused) return;

        this.isRunning = true;
        this.isPaused = false;
        this.lastStepTime = Date.now();

        this.runLoop();
    }

    /**
     * Pause simulation
     */
    pause() {
        this.isPaused = true;
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
    }

    /**
     * Main simulation loop
     */
    runLoop() {
        if (!this.isRunning || this.isPaused) return;

        const now = Date.now();
        const elapsed = now - this.lastStepTime;
        const effectiveInterval = this.config.accessInterval / this.speed;

        if (elapsed >= effectiveInterval) {
            this.step();
            this.lastStepTime = now;
        }

        this.animationFrameId = requestAnimationFrame(() => this.runLoop());
    }

    /**
     * Set simulation speed multiplier
     */
    setSpeed(speed) {
        this.speed = Math.max(0.1, Math.min(10, speed));
    }

    /**
     * Set workload intensity
     */
    setIntensity(intensity) {
        this.workloadGenerator.setIntensity(intensity);
    }

    /**
     * Load a scenario
     */
    loadScenario(scenario) {
        this.reset();

        // Apply config
        this.updateConfig(scenario.config);

        // Add processes
        for (const procDef of scenario.processes) {
            this.addProcess(procDef.name, procDef.pages, {
                locality: procDef.locality,
                icon: procDef.icon
            });
        }
    }

    /**
     * Get current statistics
     */
    getStats() {
        const ramUsage = this.frames.filter(f => f.isOccupied()).length;
        const ramUtilization = (ramUsage / this.config.ramFrames) * 100;
        const swapStats = this.swapSystem.getStats();

        return {
            // Page faults
            totalPageFaults: this.stats.totalPageFaults,
            pageFaultsPerSecond: this.stats.pageFaultsThisSecond,

            // Swap operations
            swapInCount: this.stats.swapInCount,
            swapOutCount: this.stats.swapOutCount,
            diskIORate: swapStats.ioRate,

            // Memory usage
            ramUsed: ramUsage,
            ramTotal: this.config.ramFrames,
            ramUtilization: ramUtilization,
            swapUsed: swapStats.usedBlocks,
            swapTotal: swapStats.totalBlocks,
            swapUtilization: swapStats.utilization,

            // Performance
            memoryAccesses: this.stats.memoryAccesses,
            hitCount: this.stats.hitCount,
            hitRatio: this.stats.memoryAccesses > 0
                ? (this.stats.hitCount / this.stats.memoryAccesses * 100).toFixed(1)
                : 0,

            // Thrashing
            isThrashing: this.isThrashing,
            thrashingLevel: Math.min(100, (swapStats.ioRate / this.thrashingThreshold) * 100),

            // Time
            simulationTime: this.simulationTime,

            // Policy
            currentPolicy: this.policy.getName()
        };
    }

    /**
     * Get all frames
     */
    getFrames() {
        return this.frames;
    }

    /**
     * Get all pages
     */
    getAllPages() {
        return Array.from(this.allPages.values());
    }

    /**
     * Reset simulation
     */
    reset() {
        this.pause();

        // Clear state
        this.processes = [];
        this.allPages.clear();
        this.pageIdCounter = 0;
        this.simulationTime = 0;
        this.isRunning = false;
        this.isPaused = false;
        this.isThrashing = false;

        // Reset stats
        this.stats = {
            totalPageFaults: 0,
            pageFaultsThisSecond: 0,
            pageFaultTimes: [],
            swapInCount: 0,
            swapOutCount: 0,
            memoryAccesses: 0,
            hitCount: 0
        };

        // Reinitialize components
        this.initializeFrames();
        this.swapSystem.reset();
        this.policy.reset();
        this.workloadGenerator.reset();
        this.workloadGenerator.setProcesses([]);
    }

    /**
     * Register event callback
     */
    on(event, callback) {
        if (this.callbacks.hasOwnProperty(event)) {
            this.callbacks[event] = callback;
        }
    }
}

// Export for browser
if (typeof window !== 'undefined') {
    window.SimulationEngine = SimulationEngine;
}
