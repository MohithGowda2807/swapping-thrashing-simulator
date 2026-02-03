/**
 * DiskBlock - Represents a swap block on disk
 */
class DiskBlock {
    constructor(id) {
        this.id = id;                    // Block ID
        this.page = null;                // Currently held page (or null if free)
        this.isFree = true;              // Free status

        // For visualization (circular platter positioning)
        this.angle = 0;                  // Angle on disk platter
        this.radius = 0;                 // Radius from center
        this.mesh = null;                // Three.js mesh reference
    }

    /**
     * Allocate a page to this block
     */
    allocate(page) {
        this.page = page;
        this.isFree = false;
    }

    /**
     * Free this block
     */
    free() {
        this.page = null;
        this.isFree = true;
    }

    /**
     * Check if block is occupied
     */
    isOccupied() {
        return !this.isFree;
    }
}

// Export for browser
if (typeof window !== 'undefined') {
    window.DiskBlock = DiskBlock;
}
