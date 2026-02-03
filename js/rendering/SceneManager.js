/**
 * SceneManager - Three.js scene setup and management
 */
class SceneManager {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;

        // Components
        this.ramVisualizer = null;
        this.diskVisualizer = null;
        this.pageRenderer = null;
        this.effectsManager = null;

        // Animation
        this.animationFrameId = null;
        this.isRunning = false;

        // Labels
        this.labels = [];
        this.showLabels = true;

        this.initialize();
    }

    /**
     * Initialize the Three.js scene
     */
    initialize() {
        if (!this.container) {
            console.error('Container not found');
            return;
        }

        // Create scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x0a0a1a);

        // Create camera
        const aspect = this.container.clientWidth / this.container.clientHeight;
        this.camera = new THREE.PerspectiveCamera(60, aspect, 0.1, 1000);
        this.camera.position.set(15, 20, 25);
        this.camera.lookAt(0, 0, 0);

        // Create renderer
        this.renderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: true
        });
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.container.appendChild(this.renderer.domElement);

        // Setup lights
        this.setupLights();

        // Setup camera controls
        this.setupControls();

        // Setup ground and grid
        this.setupEnvironment();

        // Handle resize
        window.addEventListener('resize', () => this.onWindowResize());

        // Start render loop
        this.startRenderLoop();
    }

    /**
     * Setup lighting
     */
    setupLights() {
        // Ambient light
        const ambient = new THREE.AmbientLight(0x404080, 0.6);
        this.scene.add(ambient);

        // Main directional light
        const directional = new THREE.DirectionalLight(0xffffff, 1.0);
        directional.position.set(10, 20, 10);
        directional.castShadow = true;
        directional.shadow.mapSize.width = 2048;
        directional.shadow.mapSize.height = 2048;
        directional.shadow.camera.near = 0.5;
        directional.shadow.camera.far = 100;
        directional.shadow.camera.left = -30;
        directional.shadow.camera.right = 30;
        directional.shadow.camera.top = 30;
        directional.shadow.camera.bottom = -30;
        this.scene.add(directional);

        // Accent light (purple)
        const accent1 = new THREE.PointLight(0x8b5cf6, 0.5, 50);
        accent1.position.set(-10, 10, -10);
        this.scene.add(accent1);

        // Accent light (cyan)
        const accent2 = new THREE.PointLight(0x00bcd4, 0.5, 50);
        accent2.position.set(10, 5, 10);
        this.scene.add(accent2);
    }

    /**
     * Setup orbit controls
     */
    setupControls() {
        if (typeof THREE.OrbitControls !== 'undefined') {
            this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
            this.controls.enableDamping = true;
            this.controls.dampingFactor = 0.05;
            this.controls.minDistance = 10;
            this.controls.maxDistance = 80;
            this.controls.maxPolarAngle = Math.PI / 2;
        }
    }

    /**
     * Setup environment (ground, grid)
     */
    setupEnvironment() {
        // Ground plane
        const groundGeometry = new THREE.PlaneGeometry(50, 50);
        const groundMaterial = new THREE.MeshStandardMaterial({
            color: 0x1a1a2e,
            roughness: 0.8,
            metalness: 0.2
        });
        const ground = new THREE.Mesh(groundGeometry, groundMaterial);
        ground.rotation.x = -Math.PI / 2;
        ground.position.y = -5;
        ground.receiveShadow = true;
        this.scene.add(ground);

        // Grid helper
        const gridHelper = new THREE.GridHelper(40, 40, 0x444488, 0x222244);
        gridHelper.position.y = -4.99;
        this.scene.add(gridHelper);
    }

    /**
     * Create text label sprite
     */
    createLabelSprite(text, color = '#ffffff') {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = 128;
        canvas.height = 64;

        context.fillStyle = 'rgba(0, 0, 0, 0.7)';
        context.fillRect(0, 0, canvas.width, canvas.height);

        context.font = 'Bold 24px Arial';
        context.fillStyle = color;
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillText(text, canvas.width / 2, canvas.height / 2);

        const texture = new THREE.CanvasTexture(canvas);
        const spriteMaterial = new THREE.SpriteMaterial({
            map: texture,
            transparent: true
        });
        const sprite = new THREE.Sprite(spriteMaterial);
        sprite.scale.set(2, 1, 1);

        this.labels.push(sprite);
        return sprite;
    }

    /**
     * Add label to scene
     */
    addLabel(text, position, color = '#ffffff') {
        const label = this.createLabelSprite(text, color);
        label.position.copy(position);
        label.visible = this.showLabels;
        this.scene.add(label);
        return label;
    }

    /**
     * Toggle label visibility
     */
    toggleLabels() {
        this.showLabels = !this.showLabels;
        this.labels.forEach(label => {
            label.visible = this.showLabels;
        });
    }

    /**
     * Start render loop
     */
    startRenderLoop() {
        this.isRunning = true;
        this.animate();
    }

    /**
     * Animation loop
     */
    animate() {
        if (!this.isRunning) return;

        this.animationFrameId = requestAnimationFrame(() => this.animate());

        // Update controls
        if (this.controls) {
            this.controls.update();
        }

        // Update components
        if (this.ramVisualizer) {
            this.ramVisualizer.update();
        }
        if (this.diskVisualizer) {
            this.diskVisualizer.update();
        }
        if (this.effectsManager) {
            this.effectsManager.update();
        }

        // Render
        this.renderer.render(this.scene, this.camera);
    }

    /**
     * Handle window resize
     */
    onWindowResize() {
        if (!this.container) return;

        const width = this.container.clientWidth;
        const height = this.container.clientHeight;

        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
    }

    /**
     * Reset camera to default position
     */
    resetCamera() {
        this.camera.position.set(15, 20, 25);
        this.camera.lookAt(0, 0, 0);
        if (this.controls) {
            this.controls.target.set(0, 0, 0);
            this.controls.update();
        }
    }

    /**
     * Get scene
     */
    getScene() {
        return this.scene;
    }

    /**
     * Clear all objects
     */
    clearScene() {
        // Remove all page meshes
        const toRemove = [];
        this.scene.traverse(obj => {
            if (obj.userData && obj.userData.isPage) {
                toRemove.push(obj);
            }
        });
        toRemove.forEach(obj => {
            this.scene.remove(obj);
            if (obj.geometry) obj.geometry.dispose();
            if (obj.material) obj.material.dispose();
        });

        // Clear labels
        this.labels.forEach(label => {
            this.scene.remove(label);
        });
        this.labels = [];
    }

    /**
     * Dispose
     */
    dispose() {
        this.isRunning = false;
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
        }
        this.renderer.dispose();
    }
}

// Export for browser
if (typeof window !== 'undefined') {
    window.SceneManager = SceneManager;
}
