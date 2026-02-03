/**
 * Page - Represents a memory page in virtual memory
 * Contains metadata for page replacement algorithms
 */
class Page {
    constructor(id, processId, processName) {
        this.id = id;                        // Unique page ID
        this.processId = processId;          // Owner process ID
        this.processName = processName;      // Owner process name
        this.virtualAddress = id * 4096;     // Virtual address (symbolic)

        // Location tracking
        this.frameId = null;                 // Physical frame ID (if in RAM)
        this.diskBlockId = null;             // Disk block ID (if swapped)
        this.location = 'none';              // 'ram' | 'disk' | 'none'

        // For page replacement algorithms
        this.lastAccessTime = 0;             // Timestamp for LRU
        this.loadTime = 0;                   // Timestamp for FIFO
        this.accessCount = 0;                // Access count for LFU
        this.referenceBit = 0;               // For Clock algorithm
        this.modifiedBit = false;            // Dirty bit

        // For visualization
        this.mesh = null;                    // Three.js mesh reference
        this.color = null;                   // Assigned color
    }

    /**
     * Record a page access
     */
    access(timestamp) {
        this.lastAccessTime = timestamp;
        this.accessCount++;
        this.referenceBit = 1;
    }

    /**
     * Move page to RAM
     */
    moveToRAM(frameId, timestamp) {
        this.frameId = frameId;
        this.diskBlockId = null;
        this.location = 'ram';
        this.loadTime = timestamp;
        this.lastAccessTime = timestamp;
    }

    /**
     * Move page to disk
     */
    moveToDisk(diskBlockId) {
        this.frameId = null;
        this.diskBlockId = diskBlockId;
        this.location = 'disk';
        this.referenceBit = 0;
    }

    /**
     * Get display label for visualization
     */
    getLabel() {
        return `P${this.id}`;
    }

    /**
     * Get detailed info for tooltips
     */
    getInfo() {
        return {
            id: this.id,
            process: this.processName,
            location: this.location,
            frame: this.frameId,
            diskBlock: this.diskBlockId,
            accesses: this.accessCount
        };
    }
}

// Export for browser
if (typeof window !== 'undefined') {
    window.Page = Page;
}
