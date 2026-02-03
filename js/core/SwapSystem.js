/**
 * SwapSystem - Manages the swap space on disk
 * Tracks I/O operations for KPI display
 */
class SwapSystem {
    constructor(blockCount) {
        this.blockCount = blockCount;
        this.blocks = [];
        this.freeBlocks = [];

        // I/O Statistics
        this.swapInCount = 0;
        this.swapOutCount = 0;
        this.ioOperations = [];      // Recent I/O operations with timestamps
        this.ioWindow = 1000;        // Window for calculating I/O rate (ms)

        this.initialize();
    }

    /**
     * Initialize disk blocks
     */
    initialize() {
        this.blocks = [];
        this.freeBlocks = [];

        for (let i = 0; i < this.blockCount; i++) {
            const block = new DiskBlock(i);
            // Calculate position on circular platter
            const angle = (i / this.blockCount) * Math.PI * 2;
            const radius = 3 + (i % 3) * 0.8; // Multiple rings
            block.angle = angle;
            block.radius = radius;
            this.blocks.push(block);
            this.freeBlocks.push(block);
        }
    }

    /**
     * Allocate a block for a page being swapped out
     */
    allocateBlock(page) {
        if (this.freeBlocks.length === 0) {
            console.error('Swap space full!');
            return null;
        }

        const block = this.freeBlocks.shift();
        block.allocate(page);
        page.moveToDisk(block.id);

        // Record I/O
        this.swapOutCount++;
        this.recordIO('out');

        return block;
    }

    /**
     * Free a block when page is swapped back in
     */
    freeBlock(blockId) {
        const block = this.blocks[blockId];
        if (block) {
            block.free();
            this.freeBlocks.push(block);

            // Record I/O
            this.swapInCount++;
            this.recordIO('in');
        }
    }

    /**
     * Record an I/O operation with timestamp
     */
    recordIO(type) {
        const now = Date.now();
        this.ioOperations.push({ time: now, type });

        // Clean old operations outside window
        this.ioOperations = this.ioOperations.filter(
            op => now - op.time < this.ioWindow
        );
    }

    /**
     * Get current I/O rate (operations per second)
     */
    getIORate() {
        const now = Date.now();
        const recentOps = this.ioOperations.filter(
            op => now - op.time < this.ioWindow
        );
        return (recentOps.length / this.ioWindow) * 1000;
    }

    /**
     * Get swap utilization percentage
     */
    getUtilization() {
        const usedBlocks = this.blocks.filter(b => b.isOccupied()).length;
        return (usedBlocks / this.blockCount) * 100;
    }

    /**
     * Get number of used blocks
     */
    getUsedCount() {
        return this.blocks.filter(b => b.isOccupied()).length;
    }

    /**
     * Get statistics
     */
    getStats() {
        return {
            totalBlocks: this.blockCount,
            usedBlocks: this.getUsedCount(),
            freeBlocks: this.freeBlocks.length,
            utilization: this.getUtilization(),
            swapInCount: this.swapInCount,
            swapOutCount: this.swapOutCount,
            ioRate: this.getIORate()
        };
    }

    /**
     * Get a block by page
     */
    getBlockByPage(page) {
        return this.blocks.find(b => b.page === page);
    }

    /**
     * Reset swap system
     */
    reset() {
        this.swapInCount = 0;
        this.swapOutCount = 0;
        this.ioOperations = [];
        this.initialize();
    }

    /**
     * Resize swap space
     */
    resize(newBlockCount) {
        this.blockCount = newBlockCount;
        this.reset();
    }
}

// Export for browser
if (typeof window !== 'undefined') {
    window.SwapSystem = SwapSystem;
}
