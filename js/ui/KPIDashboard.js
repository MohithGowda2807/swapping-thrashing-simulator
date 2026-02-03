/**
 * KPIDashboard - Real-time metrics display
 */
class KPIDashboard {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.metrics = {};

        this.createDashboard();
    }

    /**
     * Create the dashboard structure
     */
    createDashboard() {
        if (!this.container) return;

        this.container.innerHTML = `
            <div class="kpi-grid">
                <div class="kpi-card" id="kpi-page-faults">
                    <div class="kpi-icon">📊</div>
                    <div class="kpi-value" id="kpi-faults-value">0</div>
                    <div class="kpi-label">Total Page Faults</div>
                </div>
                
                <div class="kpi-card" id="kpi-fault-rate">
                    <div class="kpi-icon">⚡</div>
                    <div class="kpi-value" id="kpi-rate-value">0</div>
                    <div class="kpi-label">Faults/Second</div>
                </div>
                
                <div class="kpi-card" id="kpi-swap-in">
                    <div class="kpi-icon">📥</div>
                    <div class="kpi-value" id="kpi-swapin-value">0</div>
                    <div class="kpi-label">Swap-In Count</div>
                </div>
                
                <div class="kpi-card" id="kpi-swap-out">
                    <div class="kpi-icon">📤</div>
                    <div class="kpi-value" id="kpi-swapout-value">0</div>
                    <div class="kpi-label">Swap-Out Count</div>
                </div>
                
                <div class="kpi-card" id="kpi-io-rate">
                    <div class="kpi-icon">💾</div>
                    <div class="kpi-value" id="kpi-io-value">0.0</div>
                    <div class="kpi-label">Disk I/O ops/s</div>
                </div>
                
                <div class="kpi-card" id="kpi-hit-ratio">
                    <div class="kpi-icon">🎯</div>
                    <div class="kpi-value" id="kpi-hit-value">0%</div>
                    <div class="kpi-label">Hit Ratio</div>
                </div>
            </div>
            
            <div class="utilization-section">
                <div class="utilization-bar">
                    <div class="utilization-header">
                        <span class="utilization-label">RAM Utilization</span>
                        <span class="utilization-value" id="ram-util-text">0/0</span>
                    </div>
                    <div class="progress-bar">
                        <div class="progress-fill ram-fill" id="ram-util-bar" style="width: 0%"></div>
                    </div>
                </div>
                
                <div class="utilization-bar">
                    <div class="utilization-header">
                        <span class="utilization-label">Swap Utilization</span>
                        <span class="utilization-value" id="swap-util-text">0/0</span>
                    </div>
                    <div class="progress-bar">
                        <div class="progress-fill swap-fill" id="swap-util-bar" style="width: 0%"></div>
                    </div>
                </div>
            </div>
            
            <div class="thrashing-section" id="thrashing-section">
                <div class="thrashing-meter">
                    <div class="thrashing-header">
                        <span>Thrashing Level</span>
                        <span id="thrashing-percent">0%</span>
                    </div>
                    <div class="thrashing-bar">
                        <div class="thrashing-fill" id="thrashing-fill" style="width: 0%"></div>
                    </div>
                </div>
                <div class="thrashing-indicator hidden" id="thrashing-alert">
                    <span class="warning-icon">⚠️</span>
                    <span>THRASHING DETECTED</span>
                </div>
            </div>
        `;

        // Cache DOM references
        this.elements = {
            faultsValue: document.getElementById('kpi-faults-value'),
            rateValue: document.getElementById('kpi-rate-value'),
            swapInValue: document.getElementById('kpi-swapin-value'),
            swapOutValue: document.getElementById('kpi-swapout-value'),
            ioValue: document.getElementById('kpi-io-value'),
            hitValue: document.getElementById('kpi-hit-value'),
            ramUtilText: document.getElementById('ram-util-text'),
            ramUtilBar: document.getElementById('ram-util-bar'),
            swapUtilText: document.getElementById('swap-util-text'),
            swapUtilBar: document.getElementById('swap-util-bar'),
            thrashingPercent: document.getElementById('thrashing-percent'),
            thrashingFill: document.getElementById('thrashing-fill'),
            thrashingAlert: document.getElementById('thrashing-alert')
        };
    }

    /**
     * Update all metrics
     */
    update(stats) {
        if (!this.elements.faultsValue) return;

        // Page faults
        this.elements.faultsValue.textContent = stats.totalPageFaults;
        this.elements.rateValue.textContent = stats.pageFaultsPerSecond;

        // Swap operations
        this.elements.swapInValue.textContent = stats.swapInCount;
        this.elements.swapOutValue.textContent = stats.swapOutCount;

        // I/O rate
        this.elements.ioValue.textContent = stats.diskIORate.toFixed(1);

        // Hit ratio
        this.elements.hitValue.textContent = stats.hitRatio + '%';

        // RAM utilization
        this.elements.ramUtilText.textContent = `${stats.ramUsed}/${stats.ramTotal} frames`;
        this.elements.ramUtilBar.style.width = `${stats.ramUtilization}%`;

        // Swap utilization
        this.elements.swapUtilText.textContent = `${stats.swapUsed}/${stats.swapTotal} blocks`;
        this.elements.swapUtilBar.style.width = `${stats.swapUtilization}%`;

        // Thrashing level
        const thrashingLevel = Math.min(100, stats.thrashingLevel || 0);
        this.elements.thrashingPercent.textContent = `${thrashingLevel.toFixed(0)}%`;
        this.elements.thrashingFill.style.width = `${thrashingLevel}%`;

        // Thrashing color
        if (thrashingLevel > 80) {
            this.elements.thrashingFill.style.background = 'linear-gradient(90deg, #ef4444, #dc2626)';
        } else if (thrashingLevel > 50) {
            this.elements.thrashingFill.style.background = 'linear-gradient(90deg, #f59e0b, #ea580c)';
        } else {
            this.elements.thrashingFill.style.background = 'linear-gradient(90deg, #22c55e, #16a34a)';
        }

        // Thrashing alert
        if (stats.isThrashing) {
            this.elements.thrashingAlert.classList.remove('hidden');
        } else {
            this.elements.thrashingAlert.classList.add('hidden');
        }
    }

    /**
     * Reset dashboard
     */
    reset() {
        this.update({
            totalPageFaults: 0,
            pageFaultsPerSecond: 0,
            swapInCount: 0,
            swapOutCount: 0,
            diskIORate: 0,
            hitRatio: 0,
            ramUsed: 0,
            ramTotal: 0,
            ramUtilization: 0,
            swapUsed: 0,
            swapTotal: 0,
            swapUtilization: 0,
            thrashingLevel: 0,
            isThrashing: false
        });
    }
}

// Export for browser
if (typeof window !== 'undefined') {
    window.KPIDashboard = KPIDashboard;
}
