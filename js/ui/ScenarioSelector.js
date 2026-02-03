/**
 * ScenarioSelector - Dropdown for selecting predefined scenarios
 */
class ScenarioSelector {
    constructor(containerId, callbacks = {}) {
        this.container = document.getElementById(containerId);
        this.callbacks = callbacks;
        this.currentScenario = null;

        this.createSelector();
    }

    /**
     * Create selector structure
     */
    createSelector() {
        if (!this.container) return;

        const scenarios = getAvailableScenarios();

        this.container.innerHTML = `
            <div class="scenario-selector">
                <h3 class="section-title">Scenarios</h3>
                <div class="scenario-dropdown">
                    <select id="scenario-select">
                        ${scenarios.map(s => `
                            <option value="${s.id}">${s.icon} ${s.name}</option>
                        `).join('')}
                    </select>
                </div>
                <div class="scenario-description" id="scenario-description">
                    ${scenarios[0]?.description || ''}
                </div>
                <button class="btn btn-primary full-width" id="btn-load-scenario">
                    Load Scenario
                </button>
            </div>
            
            <div class="quick-processes">
                <h4 class="subsection-title">Add Processes</h4>
                <div class="process-buttons">
                    <button class="btn btn-process" data-name="Browser" data-pages="12" data-locality="0.7">
                        🌐 Browser
                    </button>
                    <button class="btn btn-process" data-name="IDE" data-pages="16" data-locality="0.6">
                        💻 IDE
                    </button>
                    <button class="btn btn-process" data-name="Game" data-pages="20" data-locality="0.4">
                        🎮 Game
                    </button>
                    <button class="btn btn-process" data-name="Editor" data-pages="25" data-locality="0.35">
                        🎬 Editor
                    </button>
                    <button class="btn btn-process" data-name="Music" data-pages="6" data-locality="0.9">
                        🎵 Music
                    </button>
                    <button class="btn btn-process" data-name="Notes" data-pages="4" data-locality="0.95">
                        📝 Notes
                    </button>
                </div>
            </div>
        `;

        this.elements = {
            select: document.getElementById('scenario-select'),
            description: document.getElementById('scenario-description'),
            loadBtn: document.getElementById('btn-load-scenario'),
            processButtons: this.container.querySelectorAll('.btn-process')
        };

        this.attachEventListeners();
    }

    /**
     * Attach event listeners
     */
    attachEventListeners() {
        // Scenario select change
        this.elements.select.addEventListener('change', (e) => {
            const scenario = getScenario(e.target.value);
            this.elements.description.textContent = scenario.description;
        });

        // Load scenario button
        this.elements.loadBtn.addEventListener('click', () => {
            const scenarioId = this.elements.select.value;
            const scenario = getScenario(scenarioId);
            this.currentScenario = scenario;

            if (this.callbacks.onScenarioLoad) {
                this.callbacks.onScenarioLoad(scenario);
            }
        });

        // Process buttons
        this.elements.processButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const name = btn.dataset.name;
                const pages = parseInt(btn.dataset.pages);
                const locality = parseFloat(btn.dataset.locality);

                if (this.callbacks.onAddProcess) {
                    this.callbacks.onAddProcess(name, pages, { locality });
                }
            });
        });
    }

    /**
     * Set current scenario
     */
    setScenario(scenarioId) {
        this.elements.select.value = scenarioId;
        const scenario = getScenario(scenarioId);
        this.elements.description.textContent = scenario.description;
        this.currentScenario = scenario;
    }

    /**
     * Get current scenario
     */
    getScenario() {
        return this.currentScenario;
    }
}

// Export for browser
if (typeof window !== 'undefined') {
    window.ScenarioSelector = ScenarioSelector;
}
