/**
 * EventLog - Timeline and event log panel
 */
class EventLog {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.maxEntries = 100;
        this.entries = [];

        this.createLog();
    }

    /**
     * Create log structure
     */
    createLog() {
        if (!this.container) return;

        this.container.innerHTML = `
            <div class="event-log-header">
                <h3 class="section-title">Event Timeline</h3>
                <button class="btn-icon-only" id="btn-clear-log" title="Clear Log">
                    🗑️
                </button>
            </div>
            <div class="event-log-content" id="event-log-content">
                <div class="log-entry info">System initialized. Ready to simulate.</div>
            </div>
        `;

        this.logContent = document.getElementById('event-log-content');

        document.getElementById('btn-clear-log').addEventListener('click', () => {
            this.clear();
        });
    }

    /**
     * Add log entry
     */
    log(message, type = 'info', details = null) {
        if (!this.logContent) return;

        const timestamp = new Date().toLocaleTimeString();

        const entry = document.createElement('div');
        entry.className = `log-entry ${type}`;
        entry.innerHTML = `
            <span class="log-time">[${timestamp}]</span>
            <span class="log-message">${message}</span>
            ${details ? `<span class="log-details">${details}</span>` : ''}
        `;

        this.logContent.appendChild(entry);
        this.entries.push(entry);

        // Remove old entries
        while (this.entries.length > this.maxEntries) {
            const old = this.entries.shift();
            if (old.parentNode) {
                old.parentNode.removeChild(old);
            }
        }

        // Scroll to bottom
        this.logContent.scrollTop = this.logContent.scrollHeight;
    }

    /**
     * Log page fault event
     */
    logPageFault(page) {
        this.log(
            `⚠️ Page Fault: P${page.id}`,
            'warning',
            `Process: ${page.processName}`
        );
    }

    /**
     * Log page access
     */
    logPageAccess(page, isHit) {
        if (isHit) {
            this.log(
                `✓ Page Hit: P${page.id}`,
                'success'
            );
        }
    }

    /**
     * Log swap out
     */
    logSwapOut(page, policy) {
        this.log(
            `📤 Swap Out: P${page.id}`,
            'info',
            `Policy: ${policy}, → Disk`
        );
    }

    /**
     * Log swap in
     */
    logSwapIn(page) {
        this.log(
            `📥 Swap In: P${page.id}`,
            'info',
            `← Disk to RAM`
        );
    }

    /**
     * Log thrashing state change
     */
    logThrashing(isThrashing) {
        if (isThrashing) {
            this.log(
                `🚨 THRASHING DETECTED`,
                'danger',
                'System spending more time swapping than executing!'
            );
        } else {
            this.log(
                `✓ Thrashing subsided`,
                'success'
            );
        }
    }

    /**
     * Log process added
     */
    logProcessAdded(process) {
        this.log(
            `➕ Process Added: ${process.name}`,
            'info',
            `${process.pageCount} pages, locality: ${process.locality}`
        );
    }

    /**
     * Log scenario loaded
     */
    logScenarioLoaded(scenario) {
        this.log(
            `🎬 Scenario Loaded: ${scenario.name}`,
            'success',
            scenario.description
        );
    }

    /**
     * Log simulation start
     */
    logSimulationStart() {
        this.log(`▶️ Simulation started`, 'info');
    }

    /**
     * Log simulation pause
     */
    logSimulationPause() {
        this.log(`⏸️ Simulation paused`, 'info');
    }

    /**
     * Log simulation reset
     */
    logSimulationReset() {
        this.log(`🔄 Simulation reset`, 'info');
    }

    /**
     * Clear log
     */
    clear() {
        if (!this.logContent) return;

        this.logContent.innerHTML = `
            <div class="log-entry info">Log cleared. Ready to simulate.</div>
        `;
        this.entries = [];
    }
}

// Export for browser
if (typeof window !== 'undefined') {
    window.EventLog = EventLog;
}
