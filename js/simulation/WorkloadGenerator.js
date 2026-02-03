/**
 * WorkloadGenerator - Generates memory access patterns for simulation
 */
class WorkloadGenerator {
    constructor() {
        this.processes = [];
        this.accessQueue = [];
        this.intensity = 1.0;  // Workload intensity multiplier
    }

    /**
     * Set processes for workload generation
     */
    setProcesses(processes) {
        this.processes = processes;
    }

    /**
     * Set workload intensity (affects access frequency)
     */
    setIntensity(intensity) {
        this.intensity = Math.max(0.1, Math.min(10, intensity));
    }

    /**
     * Generate next memory access
     * Returns { process, page } or null if no processes
     */
    generateAccess() {
        if (this.processes.length === 0) return null;

        // Select a random process weighted by page count
        const totalPages = this.processes.reduce((sum, p) => sum + p.pageCount, 0);
        let random = Math.random() * totalPages;

        let selectedProcess = this.processes[0];
        for (const process of this.processes) {
            random -= process.pageCount;
            if (random <= 0) {
                selectedProcess = process;
                break;
            }
        }

        // Get a page to access based on locality
        const page = selectedProcess.getRandomPageToAccess();

        return {
            process: selectedProcess,
            page: page
        };
    }

    /**
     * Generate a batch of accesses for simulation step
     */
    generateBatch(count = 1) {
        const accesses = [];
        const effectiveCount = Math.ceil(count * this.intensity);

        for (let i = 0; i < effectiveCount; i++) {
            const access = this.generateAccess();
            if (access) {
                accesses.push(access);
            }
        }

        return accesses;
    }

    /**
     * Generate access pattern for specific process
     */
    generateProcessAccess(processId) {
        const process = this.processes.find(p => p.id === processId);
        if (!process) return null;

        return {
            process: process,
            page: process.getRandomPageToAccess()
        };
    }

    /**
     * Generate burst of accesses (simulates sudden load)
     */
    generateBurst(burstSize = 5) {
        return this.generateBatch(burstSize);
    }

    /**
     * Reset workload generator
     */
    reset() {
        this.accessQueue = [];
    }
}

// Export for browser
if (typeof window !== 'undefined') {
    window.WorkloadGenerator = WorkloadGenerator;
}
