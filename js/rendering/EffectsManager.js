/**
 * EffectsManager - Manages particle systems and thrashing effects
 */
class EffectsManager {
    constructor(scene) {
        this.scene = scene;

        // Particle system
        this.particles = null;
        this.particleCount = 200;
        this.particlesEnabled = true;
        this.particlesVisible = false;

        // Thrashing effect
        this.isThrashing = false;
        this.shakeIntensity = 0;
        this.originalCameraPos = null;
        this.camera = null;

        // Time
        this.time = 0;

        this.createParticleSystem();
    }

    /**
     * Create particle system for thrashing visualization
     */
    createParticleSystem() {
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(this.particleCount * 3);
        const colors = new Float32Array(this.particleCount * 3);
        const sizes = new Float32Array(this.particleCount);

        const color1 = new THREE.Color(0xff4444);
        const color2 = new THREE.Color(0xff8800);

        for (let i = 0; i < this.particleCount; i++) {
            // Random position in a sphere
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.random() * Math.PI;
            const radius = 5 + Math.random() * 15;

            positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
            positions[i * 3 + 1] = radius * Math.cos(phi);
            positions[i * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta);

            // Random color between red and orange
            const mixAmount = Math.random();
            const mixedColor = color1.clone().lerp(color2, mixAmount);
            colors[i * 3] = mixedColor.r;
            colors[i * 3 + 1] = mixedColor.g;
            colors[i * 3 + 2] = mixedColor.b;

            sizes[i] = 0.1 + Math.random() * 0.3;
        }

        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

        const material = new THREE.PointsMaterial({
            size: 0.3,
            vertexColors: true,
            transparent: true,
            opacity: 0.7,
            sizeAttenuation: true
        });

        this.particles = new THREE.Points(geometry, material);
        this.particles.visible = false;
        this.scene.add(this.particles);
    }

    /**
     * Set camera for shake effect
     */
    setCamera(camera) {
        this.camera = camera;
        this.originalCameraPos = camera.position.clone();
    }

    /**
     * Activate thrashing effects
     */
    activateThrashing() {
        this.isThrashing = true;
        this.shakeIntensity = 0.3;
        this.particlesVisible = true;

        if (this.particles && this.particlesEnabled) {
            this.particles.visible = true;
        }
    }

    /**
     * Deactivate thrashing effects
     */
    deactivateThrashing() {
        this.isThrashing = false;
        this.shakeIntensity = 0;
        this.particlesVisible = false;

        if (this.particles) {
            this.particles.visible = false;
        }

        // Reset camera
        if (this.camera && this.originalCameraPos) {
            // Smooth return not implemented for simplicity
        }
    }

    /**
     * Toggle particles
     */
    toggleParticles() {
        this.particlesEnabled = !this.particlesEnabled;
        if (this.particles) {
            this.particles.visible = this.particlesEnabled && this.particlesVisible;
        }
    }

    /**
     * Create page fault flash effect
     */
    createPageFaultFlash(position) {
        // Create a brief flash at the position
        const flashGeometry = new THREE.SphereGeometry(0.5, 16, 16);
        const flashMaterial = new THREE.MeshBasicMaterial({
            color: 0xff6600,
            transparent: true,
            opacity: 0.8
        });

        const flash = new THREE.Mesh(flashGeometry, flashMaterial);
        flash.position.copy(position);
        this.scene.add(flash);

        // Animate and remove
        const startTime = Date.now();
        const duration = 300;

        const animate = () => {
            const elapsed = Date.now() - startTime;
            const t = elapsed / duration;

            if (t < 1) {
                flash.scale.setScalar(1 + t * 2);
                flash.material.opacity = 0.8 * (1 - t);
                requestAnimationFrame(animate);
            } else {
                this.scene.remove(flash);
                flashGeometry.dispose();
                flashMaterial.dispose();
            }
        };

        animate();
    }

    /**
     * Update effects each frame
     */
    update() {
        this.time += 0.016;

        // Update particles
        if (this.particles && this.particles.visible) {
            const positions = this.particles.geometry.attributes.position.array;

            for (let i = 0; i < this.particleCount; i++) {
                // Animate particles in a swirling pattern
                const idx = i * 3;
                const x = positions[idx];
                const y = positions[idx + 1];
                const z = positions[idx + 2];

                const radius = Math.sqrt(x * x + z * z);
                const angle = Math.atan2(z, x);
                const newAngle = angle + 0.02;

                positions[idx] = radius * Math.cos(newAngle);
                positions[idx + 1] = y + Math.sin(this.time * 2 + i) * 0.05;
                positions[idx + 2] = radius * Math.sin(newAngle);
            }

            this.particles.geometry.attributes.position.needsUpdate = true;
            this.particles.rotation.y += 0.005;
        }

        // Camera shake
        if (this.isThrashing && this.camera && this.originalCameraPos) {
            const shakeX = (Math.random() - 0.5) * this.shakeIntensity;
            const shakeY = (Math.random() - 0.5) * this.shakeIntensity;
            const shakeZ = (Math.random() - 0.5) * this.shakeIntensity;

            // Note: This modifies camera position directly
            // In practice, you might want to save/restore properly
            this.camera.position.x += shakeX;
            this.camera.position.y += shakeY;
            this.camera.position.z += shakeZ;
        }
    }

    /**
     * Dispose of effects
     */
    dispose() {
        if (this.particles) {
            this.scene.remove(this.particles);
            this.particles.geometry.dispose();
            this.particles.material.dispose();
        }
    }
}

// Export for browser
if (typeof window !== 'undefined') {
    window.EffectsManager = EffectsManager;
}
