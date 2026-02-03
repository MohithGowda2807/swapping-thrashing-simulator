/**
 * Scenarios - Built-in workload scenarios for the visualizer
 */
const SCENARIOS = {
    light: {
        id: 'light',
        name: 'Light Workload',
        description: 'Small working set with high locality. Low page fault rate expected.',
        icon: '🌱',
        config: {
            ramFrames: 32,
            swapBlocks: 64,
            pageSize: 4, // KB (symbolic)
            accessInterval: 500, // ms between accesses
            policy: 'LRU'
        },
        processes: [
            { name: 'Text Editor', pages: 8, locality: 0.9, icon: '📝' },
            { name: 'Calculator', pages: 4, locality: 0.95, icon: '🧮' }
        ],
        expectedBehavior: 'Minimal swapping, stable memory usage, low fault rate'
    },

    balanced: {
        id: 'balanced',
        name: 'Balanced Workload',
        description: 'Medium working set with moderate locality. Some page faults expected.',
        icon: '⚖️',
        config: {
            ramFrames: 24,
            swapBlocks: 64,
            pageSize: 4,
            accessInterval: 300,
            policy: 'LRU'
        },
        processes: [
            { name: 'Web Browser', pages: 16, locality: 0.7, icon: '🌐' },
            { name: 'IDE', pages: 12, locality: 0.6, icon: '💻' }
        ],
        expectedBehavior: 'Occasional swapping, moderate fault rate, stable performance'
    },

    heavy: {
        id: 'heavy',
        name: 'Heavy Workload (Thrashing)',
        description: 'Working set larger than RAM. High churn, thrashing expected!',
        icon: '🔥',
        config: {
            ramFrames: 16,
            swapBlocks: 64,
            pageSize: 4,
            accessInterval: 150,
            policy: 'LRU'
        },
        processes: [
            { name: 'Video Editor', pages: 20, locality: 0.4, icon: '🎬' },
            { name: 'Game', pages: 25, locality: 0.3, icon: '🎮' },
            { name: '3D Renderer', pages: 18, locality: 0.35, icon: '🎨' }
        ],
        expectedBehavior: 'Continuous swap activity, thrashing detected, poor performance'
    },

    experimental: {
        id: 'experimental',
        name: 'Experimental Mode',
        description: 'Full control over all parameters. Design your own workload!',
        icon: '🔬',
        config: {
            ramFrames: 32,
            swapBlocks: 64,
            pageSize: 4,
            accessInterval: 300,
            policy: 'LRU'
        },
        processes: [],
        customizable: true,
        expectedBehavior: 'Depends on your configuration!'
    },

    // Additional educational scenarios
    fifoAnomaly: {
        id: 'fifoAnomaly',
        name: 'FIFO Anomaly Demo',
        description: 'Demonstrates Belady\'s anomaly - more frames can cause more faults with FIFO.',
        icon: '🔄',
        config: {
            ramFrames: 12,
            swapBlocks: 32,
            pageSize: 4,
            accessInterval: 400,
            policy: 'FIFO'
        },
        processes: [
            { name: 'Anomaly Test', pages: 15, locality: 0.3, icon: '⚠️' }
        ],
        expectedBehavior: 'Watch how FIFO behaves - compare with LRU'
    },

    localityDemo: {
        id: 'localityDemo',
        name: 'Locality Comparison',
        description: 'Compare high-locality vs low-locality processes.',
        icon: '📊',
        config: {
            ramFrames: 20,
            swapBlocks: 48,
            pageSize: 4,
            accessInterval: 250,
            policy: 'LRU'
        },
        processes: [
            { name: 'High Locality', pages: 15, locality: 0.95, icon: '🎯' },
            { name: 'Low Locality', pages: 15, locality: 0.2, icon: '🎲' }
        ],
        expectedBehavior: 'High locality process should have fewer faults'
    }
};

/**
 * Get all available scenarios
 */
function getAvailableScenarios() {
    return Object.values(SCENARIOS).map(s => ({
        id: s.id,
        name: s.name,
        description: s.description,
        icon: s.icon
    }));
}

/**
 * Get a scenario by ID
 */
function getScenario(id) {
    return SCENARIOS[id] || SCENARIOS.light;
}

/**
 * Create custom scenario
 */
function createCustomScenario(config) {
    return {
        id: 'custom',
        name: 'Custom Scenario',
        description: 'User-defined configuration',
        icon: '⚙️',
        config: {
            ramFrames: config.ramFrames || 32,
            swapBlocks: config.swapBlocks || 64,
            pageSize: config.pageSize || 4,
            accessInterval: config.accessInterval || 300,
            policy: config.policy || 'LRU'
        },
        processes: config.processes || [],
        customizable: false
    };
}

// Export for browser
if (typeof window !== 'undefined') {
    window.SCENARIOS = SCENARIOS;
    window.getAvailableScenarios = getAvailableScenarios;
    window.getScenario = getScenario;
    window.createCustomScenario = createCustomScenario;
}
