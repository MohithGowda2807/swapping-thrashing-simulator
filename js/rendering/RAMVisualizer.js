/**
 * RAMVisualizer - Renders physical RAM as a 3D grid of frames
 */
class RAMVisualizer {
    constructor(scene, config) {
        this.scene = scene;
        this.config = config;

        this.frameCount = config.ramFrames || 32;
        this.frameMeshes = [];
        this.frameSlots = [];

        // Grid layout
        this.cols = Math.ceil(Math.sqrt(this.frameCount));
        this.rows = Math.ceil(this.frameCount / this.cols);
        this.spacing = 1.2;
        this.baseY = 3;  // Height above ground

        // Container group
        this.group = new THREE.Group();
        this.group.position.set(-5, 0, 0);
        this.scene.add(this.group);

        // Animation
        this.floatTime = 0;

        this.createBase();
        this.createFrameSlots();
    }

    /**
     * Create the RAM base platform
     */
    createBase() {
        const width = this.cols * this.spacing + 2;
        const depth = this.rows * this.spacing + 2;

        // Base platform
        const baseGeometry = new THREE.BoxGeometry(width, 0.3, depth);
        const baseMaterial = new THREE.MeshStandardMaterial({
            color: 0x1a5c3a,
            roughness: 0.4,
            metalness: 0.6,
            transparent: true,
            opacity: 0.9
        });

        const base = new THREE.Mesh(baseGeometry, baseMaterial);
        base.position.y = this.baseY - 0.5;
        base.receiveShadow = true;
        this.group.add(base);

        // Label
        this.createLabel('RAM', 0, this.baseY + 3, 0);

        // Edge glow
        const edgeGeometry = new THREE.BoxGeometry(width + 0.1, 0.4, depth + 0.1);
        const edgeMaterial = new THREE.MeshBasicMaterial({
            color: 0x4ade80,
            transparent: true,
            opacity: 0.3
        });
        const edge = new THREE.Mesh(edgeGeometry, edgeMaterial);
        edge.position.y = this.baseY - 0.5;
        this.group.add(edge);
    }

    /**
     * Create empty frame slots
     */
    createFrameSlots() {
        const slotGeometry = new THREE.BoxGeometry(0.9, 0.1, 0.9);
        const slotMaterial = new THREE.MeshStandardMaterial({
            color: 0x2a8c5a,
            transparent: true,
            opacity: 0.5,
            roughness: 0.6
        });

        for (let i = 0; i < this.frameCount; i++) {
            const col = i % this.cols;
            const row = Math.floor(i / this.cols);

            const x = (col - this.cols / 2 + 0.5) * this.spacing;
            const z = (row - this.rows / 2 + 0.5) * this.spacing;

            const slot = new THREE.Mesh(slotGeometry.clone(), slotMaterial.clone());
            slot.position.set(x, this.baseY, z);
            slot.userData = { frameId: i, isSlot: true };

            this.frameSlots.push({
                mesh: slot,
                position: new THREE.Vector3(x, this.baseY, z),
                frameId: i,
                pageMesh: null
            });

            this.group.add(slot);
        }
    }

    /**
     * Create label sprite
     */
    createLabel(text, x, y, z) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = 256;
        canvas.height = 64;

        ctx.fillStyle = 'rgba(0, 0, 0, 0)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.font = 'Bold 40px Arial';
        ctx.fillStyle = '#4ade80';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, canvas.width / 2, canvas.height / 2);

        const texture = new THREE.CanvasTexture(canvas);
        const material = new THREE.SpriteMaterial({ map: texture, transparent: true });
        const sprite = new THREE.Sprite(material);
        sprite.position.set(x, y, z);
        sprite.scale.set(4, 1, 1);
        this.group.add(sprite);
    }

    /**
     * Get position for a frame
     */
    getFramePosition(frameId) {
        if (frameId < this.frameSlots.length) {
            const slot = this.frameSlots[frameId];
            return new THREE.Vector3(
                slot.position.x + this.group.position.x,
                slot.position.y + 0.6,
                slot.position.z + this.group.position.z
            );
        }
        return new THREE.Vector3(0, this.baseY + 0.6, 0);
    }

    /**
     * Get local position for a frame (relative to group)
     */
    getLocalFramePosition(frameId) {
        if (frameId < this.frameSlots.length) {
            const slot = this.frameSlots[frameId];
            return new THREE.Vector3(
                slot.position.x,
                slot.position.y + 0.6,
                slot.position.z
            );
        }
        return new THREE.Vector3(0, this.baseY + 0.6, 0);
    }

    /**
     * Set page mesh for a frame
     */
    setPageMesh(frameId, mesh) {
        if (frameId < this.frameSlots.length) {
            this.frameSlots[frameId].pageMesh = mesh;
        }
    }

    /**
     * Clear page mesh from a frame
     */
    clearPageMesh(frameId) {
        if (frameId < this.frameSlots.length) {
            this.frameSlots[frameId].pageMesh = null;
        }
    }

    /**
     * Update animation
     */
    update() {
        this.floatTime += 0.02;

        // Animate page blocks with floating effect
        this.frameSlots.forEach((slot, i) => {
            if (slot.pageMesh) {
                const offset = Math.sin(this.floatTime + i * 0.5) * 0.1;
                slot.pageMesh.position.y = slot.position.y + 0.6 + offset;
            }
        });
    }

    /**
     * Resize the RAM grid
     */
    resize(newFrameCount) {
        // Clear existing
        this.frameSlots.forEach(slot => {
            this.group.remove(slot.mesh);
        });
        this.frameMeshes = [];
        this.frameSlots = [];

        // Recreate
        this.frameCount = newFrameCount;
        this.cols = Math.ceil(Math.sqrt(this.frameCount));
        this.rows = Math.ceil(this.frameCount / this.cols);

        this.createFrameSlots();
    }

    /**
     * Get the group object
     */
    getGroup() {
        return this.group;
    }
}

// Export for browser
if (typeof window !== 'undefined') {
    window.RAMVisualizer = RAMVisualizer;
}
