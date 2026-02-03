/**
 * LRU - Least Recently Used page replacement policy
 * Evicts the page that hasn't been accessed for the longest time
 * Uses a doubly-linked list + HashMap for O(1) operations
 */

// Doubly Linked List Node
class LRUNode {
    constructor(page) {
        this.page = page;
        this.prev = null;
        this.next = null;
    }
}

class LRU extends PolicyInterface {
    constructor() {
        super('LRU');

        // Doubly linked list: head = most recent, tail = least recent
        this.head = null;
        this.tail = null;

        // HashMap for O(1) node lookup
        this.nodeMap = new Map();  // pageId -> LRUNode
    }

    /**
     * Select the least recently used page (tail of list)
     */
    selectVictim(ramPages) {
        if (this.tail) {
            return this.tail.page;
        }

        // Fallback: find page with oldest access time
        if (ramPages.length === 0) return null;

        let lruPage = ramPages[0];
        for (const page of ramPages) {
            if (page.lastAccessTime < lruPage.lastAccessTime) {
                lruPage = page;
            }
        }
        return lruPage;
    }

    /**
     * Move page to front of list on access
     */
    onPageAccess(page, timestamp) {
        super.onPageAccess(page, timestamp);
        this.moveToFront(page);
    }

    /**
     * Add page to front of list on load
     */
    onPageLoad(page, timestamp) {
        this.addToFront(page);
    }

    /**
     * Add a new node to the front of the list
     */
    addToFront(page) {
        // Check if already exists
        if (this.nodeMap.has(page.id)) {
            this.moveToFront(page);
            return;
        }

        const node = new LRUNode(page);
        this.nodeMap.set(page.id, node);

        if (!this.head) {
            // Empty list
            this.head = node;
            this.tail = node;
        } else {
            // Add to front
            node.next = this.head;
            this.head.prev = node;
            this.head = node;
        }
    }

    /**
     * Move existing node to front of list
     */
    moveToFront(page) {
        const node = this.nodeMap.get(page.id);
        if (!node) {
            this.addToFront(page);
            return;
        }

        // Already at front
        if (node === this.head) return;

        // Remove from current position
        if (node.prev) node.prev.next = node.next;
        if (node.next) node.next.prev = node.prev;

        // Update tail if needed
        if (node === this.tail) {
            this.tail = node.prev;
        }

        // Move to front
        node.prev = null;
        node.next = this.head;
        if (this.head) this.head.prev = node;
        this.head = node;
    }

    /**
     * Remove a page from the list (when evicted)
     */
    onEvict(page) {
        const node = this.nodeMap.get(page.id);
        if (!node) return;

        // Remove from list
        if (node.prev) node.prev.next = node.next;
        if (node.next) node.next.prev = node.prev;

        // Update head/tail
        if (node === this.head) this.head = node.next;
        if (node === this.tail) this.tail = node.prev;

        // Remove from map
        this.nodeMap.delete(page.id);
    }

    getDescription() {
        return 'Least Recently Used - Evicts the page not accessed for longest time';
    }

    reset() {
        this.head = null;
        this.tail = null;
        this.nodeMap.clear();
    }

    /**
     * Debug: get list order
     */
    getOrder() {
        const order = [];
        let current = this.head;
        while (current) {
            order.push(current.page.id);
            current = current.next;
        }
        return order;
    }
}

// Export for browser
if (typeof window !== 'undefined') {
    window.LRU = LRU;
    window.LRUNode = LRUNode;
}
