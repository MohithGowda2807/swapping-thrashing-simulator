/**
 * Process - Represents a running process with its pages
 */
class Process {
    constructor(id, name, pageCount, options = {}) {
        this.id = id;                          // Process ID
        this.name = name;                      // Process name
        this.pageCount = pageCount;            // Number of pages
        this.pages = [];                       // Array of Page objects

        // Workload characteristics
        this.locality = options.locality || 0.7;    // Locality factor (0-1)
        this.workingSetSize = options.workingSetSize || Math.ceil(pageCount * 0.4);

        // Statistics
        this.totalAccesses = 0;
        this.pageFaults = 0;

        // Visualization
        this.color = options.color || this.generateColor();
        this.icon = options.icon || '📦';
    }

    /**
     * Generate a unique color for this process
     */
    generateColor() {
        const hue = (this.id * 137.508) % 360; // Golden angle approximation
        return `hsl(${hue}, 70%, 60%)`;
    }

    /**
     * Create all pages for this process
     */
    createPages(startId) {
        this.pages = [];
        for (let i = 0; i < this.pageCount; i++) {
            const page = new Page(startId + i, this.id, this.name);
            page.color = this.color;
            this.pages.push(page);
        }
        return this.pages;
    }

    /**
     * Get a random page to access based on locality
     * Higher locality = more likely to access recently accessed pages
     */
    getRandomPageToAccess() {
        if (this.pages.length === 0) return null;

        if (Math.random() < this.locality) {
            // Access from working set (recently used pages)
            const recentPages = [...this.pages]
                .sort((a, b) => b.lastAccessTime - a.lastAccessTime)
                .slice(0, this.workingSetSize);
            return recentPages[Math.floor(Math.random() * recentPages.length)];
        } else {
            // Random access across all pages
            return this.pages[Math.floor(Math.random() * this.pages.length)];
        }
    }

    /**
     * Get pages currently in RAM
     */
    getPagesInRAM() {
        return this.pages.filter(p => p.location === 'ram');
    }

    /**
     * Get pages currently on disk
     */
    getPagesOnDisk() {
        return this.pages.filter(p => p.location === 'disk');
    }

    /**
     * Record a page fault
     */
    recordPageFault() {
        this.pageFaults++;
    }

    /**
     * Record a page access
     */
    recordAccess() {
        this.totalAccesses++;
    }

    /**
     * Get process statistics
     */
    getStats() {
        return {
            name: this.name,
            totalPages: this.pageCount,
            pagesInRAM: this.getPagesInRAM().length,
            pagesOnDisk: this.getPagesOnDisk().length,
            pageFaults: this.pageFaults,
            totalAccesses: this.totalAccesses,
            faultRate: this.totalAccesses > 0
                ? (this.pageFaults / this.totalAccesses * 100).toFixed(1)
                : 0
        };
    }
}

// Export for browser
if (typeof window !== 'undefined') {
    window.Process = Process;
}
