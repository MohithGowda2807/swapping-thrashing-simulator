/**
 * PolicyInterface - Abstract interface for page replacement policies
 */
class PolicyInterface {
    constructor(name) {
        this.name = name;
    }

    /**
     * Select a victim page to evict from RAM
     * @param {Page[]} ramPages - Array of pages currently in RAM
     * @returns {Page} - The page to evict
     */
    selectVictim(ramPages) {
        throw new Error('selectVictim must be implemented by subclass');
    }

    /**
     * Called when a page is accessed
     * @param {Page} page - The accessed page
     * @param {number} timestamp - Current timestamp
     */
    onPageAccess(page, timestamp) {
        page.access(timestamp);
    }

    /**
     * Called when a page is loaded into RAM
     * @param {Page} page - The loaded page
     * @param {number} timestamp - Current timestamp
     */
    onPageLoad(page, timestamp) {
        // Default implementation
    }

    /**
     * Get policy name
     */
    getName() {
        return this.name;
    }

    /**
     * Get policy description
     */
    getDescription() {
        return 'Base policy interface';
    }

    /**
     * Reset policy state
     */
    reset() {
        // Override in subclass if needed
    }
}

// Export for browser
if (typeof window !== 'undefined') {
    window.PolicyInterface = PolicyInterface;
}
