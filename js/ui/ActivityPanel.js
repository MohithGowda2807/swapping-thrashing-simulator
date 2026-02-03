/**
 * ActivityPanel - Real-time display of current memory operations
 * Shows page accesses, swaps, and policy decisions
 */
class ActivityPanel {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.currentState = {
            accessedPage: null,
            swapInPage: null,
            swapOutPage: null,
            policyAction: null,
            victimReason: null
        };

        this.createPanel();
    }

    /**
     * Create the panel structure
     */
    createPanel() {
        if (!this.container) return;

        this.container.innerHTML = `
            <div class="activity-panel">
                <h3 class="section-title">📊 Current Activity</h3>
                
                <!-- Current Access -->
                <div class="activity-card" id="activity-access">
                    <div class="activity-header">
                        <span class="activity-icon">🔍</span>
                        <span class="activity-label">Page Being Accessed</span>
                    </div>
                    <div class="activity-content" id="access-content">
                        <span class="activity-idle">Waiting for simulation...</span>
                    </div>
                </div>

                <!-- Page Fault Status -->
                <div class="activity-card" id="activity-fault">
                    <div class="activity-header">
                        <span class="activity-icon">⚠️</span>
                        <span class="activity-label">Page Fault Status</span>
                    </div>
                    <div class="activity-content" id="fault-content">
                        <span class="activity-idle">No fault</span>
                    </div>
                </div>

                <!-- Swap Out -->
                <div class="activity-card" id="activity-swapout">
                    <div class="activity-header">
                        <span class="activity-icon">📤</span>
                        <span class="activity-label">Swapping Out (RAM → Disk)</span>
                    </div>
                    <div class="activity-content" id="swapout-content">
                        <span class="activity-idle">—</span>
                    </div>
                </div>

                <!-- Swap In -->
                <div class="activity-card" id="activity-swapin">
                    <div class="activity-header">
                        <span class="activity-icon">📥</span>
                        <span class="activity-label">Swapping In (Disk → RAM)</span>
                    </div>
                    <div class="activity-content" id="swapin-content">
                        <span class="activity-idle">—</span>
                    </div>
                </div>

                <!-- Policy Decision -->
                <div class="activity-card" id="activity-policy">
                    <div class="activity-header">
                        <span class="activity-icon">🧠</span>
                        <span class="activity-label">Policy Decision</span>
                    </div>
                    <div class="activity-content" id="policy-content">
                        <span class="activity-idle">—</span>
                    </div>
                </div>

                <!-- OS Concept Quick Reference -->
                <div class="activity-info">
                    <details>
                        <summary>💡 What's happening?</summary>
                        <div class="info-details">
                            <p><strong>Page Access:</strong> CPU requests a memory page</p>
                            <p><strong>Page Hit:</strong> Page found in RAM ✅</p>
                            <p><strong>Page Fault:</strong> Page not in RAM, must fetch from disk ⚠️</p>
                            <p><strong>Swap Out:</strong> Evict a page from RAM to disk to make room</p>
                            <p><strong>Swap In:</strong> Load requested page from disk to RAM</p>
                        </div>
                    </details>
                </div>
            </div>
        `;

        // Cache DOM references
        this.elements = {
            accessContent: document.getElementById('access-content'),
            faultContent: document.getElementById('fault-content'),
            swapoutContent: document.getElementById('swapout-content'),
            swapinContent: document.getElementById('swapin-content'),
            policyContent: document.getElementById('policy-content'),
            accessCard: document.getElementById('activity-access'),
            faultCard: document.getElementById('activity-fault'),
            swapoutCard: document.getElementById('activity-swapout'),
            swapinCard: document.getElementById('activity-swapin')
        };
    }

    /**
     * Update page access display
     */
    showPageAccess(page, isHit) {
        if (!this.elements.accessContent) return;

        const statusClass = isHit ? 'status-hit' : 'status-fault';
        const statusText = isHit ? 'HIT ✅' : 'FAULT ⚠️';

        this.elements.accessContent.innerHTML = `
            <div class="activity-page ${statusClass}">
                <span class="page-id">Page ${page.id}</span>
                <span class="page-process">(${page.processName || 'Process ' + page.processId})</span>
                <span class="page-status">${statusText}</span>
            </div>
        `;

        // Animate the card
        this.pulseCard(this.elements.accessCard, isHit ? 'pulse-hit' : 'pulse-fault');
    }

    /**
     * Show page fault
     */
    showPageFault(page) {
        if (!this.elements.faultContent) return;

        this.elements.faultContent.innerHTML = `
            <div class="activity-fault-info">
                <span class="fault-page">Page ${page.id} not in RAM!</span>
                <span class="fault-action">Fetching from disk...</span>
            </div>
        `;

        this.pulseCard(this.elements.faultCard, 'pulse-fault');
    }

    /**
     * Show swap out operation
     */
    showSwapOut(page, victimReason, policy, targetBlockId) {
        if (!this.elements.swapoutContent) return;

        this.elements.swapoutContent.innerHTML = `
            <div class="activity-swap">
                <div class="swap-page">
                    <span class="page-label">Victim:</span>
                    <span class="page-id">Page ${page.id}</span>
                </div>
                <div class="swap-details">
                    <span class="swap-reason">📋 ${policy}: ${victimReason || 'Selected for eviction'}</span>
                    <span class="swap-destination">→ Disk Block ${targetBlockId !== undefined ? targetBlockId : '?'}</span>
                </div>
            </div>
        `;

        this.pulseCard(this.elements.swapoutCard, 'pulse-swapout');
    }

    /**
     * Show swap in operation
     */
    showSwapIn(page, sourceBlockId, targetFrameId) {
        if (!this.elements.swapinContent) return;

        this.elements.swapinContent.innerHTML = `
            <div class="activity-swap">
                <div class="swap-page">
                    <span class="page-label">Loading:</span>
                    <span class="page-id">Page ${page.id}</span>
                </div>
                <div class="swap-details">
                    <span class="swap-source">Disk Block ${sourceBlockId !== undefined ? sourceBlockId : '?'}</span>
                    <span class="swap-arrow">→</span>
                    <span class="swap-destination">RAM Frame ${targetFrameId !== undefined ? targetFrameId : '?'}</span>
                </div>
            </div>
        `;

        this.pulseCard(this.elements.swapinCard, 'pulse-swapin');
    }

    /**
     * Show policy decision
     */
    showPolicyDecision(policy, victimPage, reason) {
        if (!this.elements.policyContent) return;

        let explanation = '';
        if (policy === 'FIFO') {
            explanation = 'First-In-First-Out: Oldest page in RAM is selected';
        } else if (policy === 'LRU') {
            explanation = 'Least Recently Used: Page unused for longest time is selected';
        }

        this.elements.policyContent.innerHTML = `
            <div class="activity-policy">
                <div class="policy-header">
                    <span class="policy-name">${policy} Algorithm</span>
                </div>
                <div class="policy-victim">
                    Selected Page ${victimPage.id} for eviction
                </div>
                <div class="policy-reason">
                    ${explanation}
                </div>
            </div>
        `;
    }

    /**
     * Clear fault status
     */
    clearFault() {
        if (!this.elements.faultContent) return;
        this.elements.faultContent.innerHTML = '<span class="activity-idle">No fault</span>';
    }

    /**
     * Clear swap operations after completion
     */
    clearSwapIn() {
        if (!this.elements.swapinContent) return;
        setTimeout(() => {
            this.elements.swapinContent.innerHTML = '<span class="activity-idle">—</span>';
        }, 1500);
    }

    /**
     * Clear swap out after completion
     */
    clearSwapOut() {
        if (!this.elements.swapoutContent) return;
        setTimeout(() => {
            this.elements.swapoutContent.innerHTML = '<span class="activity-idle">—</span>';
        }, 1500);
    }

    /**
     * Pulse animation for a card
     */
    pulseCard(card, className) {
        if (!card) return;
        card.classList.remove('pulse-hit', 'pulse-fault', 'pulse-swapout', 'pulse-swapin');
        void card.offsetWidth; // Force reflow
        card.classList.add(className);

        setTimeout(() => {
            card.classList.remove(className);
        }, 600);
    }

    /**
     * Reset panel
     */
    reset() {
        if (this.elements.accessContent) {
            this.elements.accessContent.innerHTML = '<span class="activity-idle">Waiting for simulation...</span>';
        }
        if (this.elements.faultContent) {
            this.elements.faultContent.innerHTML = '<span class="activity-idle">No fault</span>';
        }
        if (this.elements.swapoutContent) {
            this.elements.swapoutContent.innerHTML = '<span class="activity-idle">—</span>';
        }
        if (this.elements.swapinContent) {
            this.elements.swapinContent.innerHTML = '<span class="activity-idle">—</span>';
        }
        if (this.elements.policyContent) {
            this.elements.policyContent.innerHTML = '<span class="activity-idle">—</span>';
        }
    }
}

// Export for browser
if (typeof window !== 'undefined') {
    window.ActivityPanel = ActivityPanel;
}
