/**
 * FIFO - First In First Out page replacement policy
 * Evicts the page that has been in RAM the longest
 */
class FIFO extends PolicyInterface {
    constructor() {
        super('FIFO');
        this.queue = [];  // Queue of page IDs in order of arrival
    }

    /**
     * Select the oldest page (first in queue)
     */
    selectVictim(ramPages) {
        if (ramPages.length === 0) return null;

        // Find the page with earliest load time
        let oldestPage = ramPages[0];
        for (const page of ramPages) {
            if (page.loadTime < oldestPage.loadTime) {
                oldestPage = page;
            }
        }

        return oldestPage;
    }

    /**
     * Track page load order
     */
    onPageLoad(page, timestamp) {
        page.loadTime = timestamp;
        // Add to queue
        const idx = this.queue.indexOf(page.id);
        if (idx === -1) {
            this.queue.push(page.id);
        }
    }

    /**
     * Remove from queue when evicted
     */
    onEvict(page) {
        const idx = this.queue.indexOf(page.id);
        if (idx !== -1) {
            this.queue.splice(idx, 1);
        }
    }

    getDescription() {
        return 'First In First Out - Evicts the oldest page in memory';
    }

    reset() {
        this.queue = [];
    }
}

// Export for browser
if (typeof window !== 'undefined') {
    window.FIFO = FIFO;
}
