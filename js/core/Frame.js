/**
 * Frame - Represents a physical memory frame in RAM
 */
class Frame {
    constructor(id) {
        this.id = id;                    // Frame ID
        this.page = null;                // Currently held page (or null if free)
        this.isFree = true;              // Free status

        // For visualization
        this.position = { x: 0, y: 0, z: 0 };  // 3D position in scene
        this.mesh = null;                       // Three.js mesh reference
    }

    /**
     * Allocate a page to this frame
     */
    allocate(page) {
        this.page = page;
        this.isFree = false;
    }

    /**
     * Free this frame
     */
    free() {
        this.page = null;
        this.isFree = true;
    }

    /**
     * Check if frame is occupied
     */
    isOccupied() {
        return !this.isFree;
    }
}

// Export for browser
if (typeof window !== 'undefined') {
    window.Frame = Frame;
}
