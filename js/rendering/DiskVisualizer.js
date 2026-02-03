/**
 * DiskVisualizer - Renders swap space as a circular disk platter
 */
class DiskVisualizer {
    constructor(scene, config) {
        this.scene = scene;
        this.config = config;

        this.blockCount = config.swapBlocks || 64;
        this.blockMeshes = [];
        this.blockSlots = [];

        // Disk layout
        this.innerRadius = 2;
        this.outerRadius = 5;
        this.baseY = -3;  // Below RAM
        this.rings = 3;   // Number of concentric rings

        // Container group
        this.group = new THREE.Group();
        this.group.position.set(10, 0, 0);
        this.scene.add(this.group);

        // Animation
        this.rotationSpeed = 0.002;
        this.isSpinning = false;

        this.createDiskPlatter();
        this.createBlockSlots();
    }

    /**
     * Create the disk platter base
     */
    createDiskPlatter() {
        // Main disk
        const diskGeometry = new THREE.CylinderGeometry(
            this.outerRadius + 0.5,
            this.outerRadius + 0.5,
            0.3,
            64
        );
        const diskMaterial = new THREE.MeshStandardMaterial({
            color: 0x1e3a5f,
            roughness: 0.3,
            metalness: 0.8
        });

        const disk = new THREE.Mesh(diskGeometry, diskMaterial);
        disk.position.y = this.baseY;
        disk.receiveShadow = true;
        this.disk = disk;
        this.group.add(disk);

        // Center hub
        const hubGeometry = new THREE.CylinderGeometry(0.8, 0.8, 0.5, 32);
        const hubMaterial = new THREE.MeshStandardMaterial({
            color: 0x3b82f6,
            roughness: 0.2,
            metalness: 0.9
        });
        const hub = new THREE.Mesh(hubGeometry, hubMaterial);
        hub.position.y = this.baseY + 0.2;
        this.group.add(hub);

        // Ring dividers
        for (let r = 0; r <= this.rings; r++) {
            const radius = this.innerRadius + (r / this.rings) * (this.outerRadius - this.innerRadius);
            const ringGeometry = new THREE.RingGeometry(radius - 0.02, radius + 0.02, 64);
            const ringMaterial = new THREE.MeshBasicMaterial({
                color: 0x60a5fa,
                side: THREE.DoubleSide,
                transparent: true,
                opacity: 0.5
            });
            const ring = new THREE.Mesh(ringGeometry, ringMaterial);
            ring.rotation.x = -Math.PI / 2;
            ring.position.y = this.baseY + 0.16;
            this.group.add(ring);
        }

        // Label
        this.createLabel('DISK (SWAP)', 0, this.baseY + 2, 0);
    }

    /**
     * Create block slots on the disk
     */
    createBlockSlots() {
        const blocksPerRing = Math.ceil(this.blockCount / this.rings);

        for (let i = 0; i < this.blockCount; i++) {
            const ringIndex = Math.floor(i / blocksPerRing);
            const posInRing = i % blocksPerRing;
            const blocksInThisRing = Math.min(blocksPerRing, this.blockCount - ringIndex * blocksPerRing);

            // Calculate position
            const angle = (posInRing / blocksInThisRing) * Math.PI * 2;
            const radius = this.innerRadius + 0.5 + (ringIndex + 0.5) *
                ((this.outerRadius - this.innerRadius - 0.5) / this.rings);

            const x = Math.cos(angle) * radius;
            const z = Math.sin(angle) * radius;

            // Create slot indicator
            const slotGeometry = new THREE.CylinderGeometry(0.25, 0.25, 0.1, 8);
            const slotMaterial = new THREE.MeshStandardMaterial({
                color: 0x2563eb,
                transparent: true,
                opacity: 0.4
            });

            const slot = new THREE.Mesh(slotGeometry, slotMaterial);
            slot.position.set(x, this.baseY + 0.2, z);
            slot.userData = { blockId: i, isSlot: true };

            this.blockSlots.push({
                mesh: slot,
                position: new THREE.Vector3(x, this.baseY + 0.2, z),
                angle: angle,
                radius: radius,
                blockId: i,
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

        ctx.font = 'Bold 32px Arial';
        ctx.fillStyle = '#60a5fa';
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
     * Get position for a disk block (world coordinates)
     */
    getBlockPosition(blockId) {
        if (blockId < this.blockSlots.length) {
            const slot = this.blockSlots[blockId];
            return new THREE.Vector3(
                slot.position.x + this.group.position.x,
                slot.position.y + 0.4,
                slot.position.z + this.group.position.z
            );
        }
        return new THREE.Vector3(this.group.position.x, this.baseY + 0.4, this.group.position.z);
    }

    /**
     * Get local position for a block
     */
    getLocalBlockPosition(blockId) {
        if (blockId < this.blockSlots.length) {
            const slot = this.blockSlots[blockId];
            return new THREE.Vector3(
                slot.position.x,
                slot.position.y + 0.4,
                slot.position.z
            );
        }
        return new THREE.Vector3(0, this.baseY + 0.4, 0);
    }

    /**
     * Set page mesh for a block
     */
    setPageMesh(blockId, mesh) {
        if (blockId < this.blockSlots.length) {
            this.blockSlots[blockId].pageMesh = mesh;
        }
    }

    /**
     * Clear page mesh from a block
     */
    clearPageMesh(blockId) {
        if (blockId < this.blockSlots.length) {
            this.blockSlots[blockId].pageMesh = null;
        }
    }

    /**
     * Start disk spinning
     */
    startSpin() {
        this.isSpinning = true;
    }

    /**
     * Stop disk spinning
     */
    stopSpin() {
        this.isSpinning = false;
    }

    /**
     * Trigger I/O activity animation
     */
    triggerIOAnimation() {
        this.isSpinning = true;
        setTimeout(() => {
            this.isSpinning = false;
        }, 500);
    }

    /**
     * Update animation
     */
    update() {
        if (this.isSpinning && this.disk) {
            this.disk.rotation.y += this.rotationSpeed;

            // Rotate block slots and their page meshes
            this.blockSlots.forEach(slot => {
                // Recalculate position based on rotation
                const newAngle = slot.angle + this.disk.rotation.y;
                const x = Math.cos(newAngle) * slot.radius;
                const z = Math.sin(newAngle) * slot.radius;

                slot.mesh.position.x = x;
                slot.mesh.position.z = z;

                if (slot.pageMesh) {
                    slot.pageMesh.position.x = x;
                    slot.pageMesh.position.z = z;
                }
            });
        }
    }

    /**
     * Resize the disk
     */
    resize(newBlockCount) {
        // Clear existing slots
        this.blockSlots.forEach(slot => {
            this.group.remove(slot.mesh);
        });
        this.blockSlots = [];

        // Recreate
        this.blockCount = newBlockCount;
        this.createBlockSlots();
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
    window.DiskVisualizer = DiskVisualizer;
}
