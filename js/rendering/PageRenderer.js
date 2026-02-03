/**
 * PageRenderer - Renders page blocks and handles animations
 */
class PageRenderer {
    constructor(scene, ramVisualizer, diskVisualizer) {
        this.scene = scene;
        this.ramVisualizer = ramVisualizer;
        this.diskVisualizer = diskVisualizer;

        // Page meshes map: pageId -> mesh
        this.pageMeshes = new Map();

        // Animation queue
        this.animations = [];

        // Colors for processes
        this.processColors = [
            0x8b5cf6, // Purple
            0x06b6d4, // Cyan
            0xf59e0b, // Amber
            0xef4444, // Red
            0x22c55e, // Green
            0xec4899, // Pink
            0x3b82f6, // Blue
            0xf97316  // Orange
        ];

        // Page geometry (shared)
        this.pageGeometry = new THREE.BoxGeometry(0.7, 0.5, 0.7);
    }

    /**
     * Get color for a process
     */
    getProcessColor(processId) {
        return this.processColors[processId % this.processColors.length];
    }

    /**
     * Create a page mesh
     */
    createPageMesh(page) {
        const color = new THREE.Color(page.color || this.getProcessColor(page.processId));

        const material = new THREE.MeshStandardMaterial({
            color: color,
            roughness: 0.3,
            metalness: 0.5,
            emissive: color,
            emissiveIntensity: 0.1
        });

        const mesh = new THREE.Mesh(this.pageGeometry.clone(), material);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        mesh.userData = {
            pageId: page.id,
            processId: page.processId,
            isPage: true
        };

        // Add label
        this.addPageLabel(mesh, page);

        this.pageMeshes.set(page.id, mesh);
        return mesh;
    }

    /**
     * Add text label to page mesh
     */
    addPageLabel(mesh, page) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = 64;
        canvas.height = 64;

        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(0, 0, 64, 64);

        ctx.font = 'Bold 20px Arial';
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`P${page.id}`, 32, 32);

        const texture = new THREE.CanvasTexture(canvas);
        const spriteMaterial = new THREE.SpriteMaterial({
            map: texture,
            transparent: true
        });
        const sprite = new THREE.Sprite(spriteMaterial);
        sprite.scale.set(0.6, 0.6, 1);
        sprite.position.y = 0.5;
        mesh.add(sprite);
    }

    /**
     * Add page to RAM at specific frame
     */
    addPageToRAM(page, frame, animated = true) {
        let mesh = this.pageMeshes.get(page.id);

        if (!mesh) {
            mesh = this.createPageMesh(page);
            this.scene.add(mesh);
        }

        const targetPos = this.ramVisualizer.getFramePosition(frame.id);

        if (animated) {
            // Animate from above
            mesh.position.set(targetPos.x, targetPos.y + 5, targetPos.z);
            mesh.scale.set(0.1, 0.1, 0.1);

            this.animateBounceIn(mesh, targetPos);
        } else {
            mesh.position.copy(targetPos);
            mesh.scale.set(1, 1, 1);
        }

        // Update RAM visualizer
        this.ramVisualizer.setPageMesh(frame.id, mesh);

        return mesh;
    }

    /**
     * Add page to disk at specific block
     */
    addPageToDisk(page, block, animated = true) {
        let mesh = this.pageMeshes.get(page.id);

        if (!mesh) {
            mesh = this.createPageMesh(page);
        }

        // Get LOCAL position within disk group
        const targetLocalPos = this.diskVisualizer.getLocalBlockPosition(block.id);

        // Change color to blue tint for disk
        mesh.material.color.setHex(0x3b82f6);
        mesh.material.emissive.setHex(0x1e40af);

        // Remove from scene if present, add to disk group
        this.scene.remove(mesh);
        this.diskVisualizer.getGroup().add(mesh);

        if (animated) {
            // Start from above the target position (local coords)
            mesh.position.set(targetLocalPos.x, targetLocalPos.y + 3, targetLocalPos.z);
            this.animateFallDown(mesh, targetLocalPos);
        } else {
            mesh.position.copy(targetLocalPos);
        }

        // Trigger disk spin
        this.diskVisualizer.triggerIOAnimation();

        // Update disk visualizer
        this.diskVisualizer.setPageMesh(block.id, mesh);

        return mesh;
    }

    /**
     * Animate page transfer from RAM to disk
     */
    animateSwapOut(page, sourceFrame, targetBlock, onComplete) {
        const mesh = this.pageMeshes.get(page.id);
        if (!mesh) return;

        const startPos = mesh.position.clone();

        // Get the disk group for coordinate transformation
        const diskGroup = this.diskVisualizer.getGroup();
        const diskWorldPos = diskGroup.position.clone();

        // Get local block position and convert to world for animation
        const targetLocalPos = this.diskVisualizer.getLocalBlockPosition(targetBlock.id);
        const endWorldPos = new THREE.Vector3(
            targetLocalPos.x + diskWorldPos.x,
            targetLocalPos.y + diskWorldPos.y,
            targetLocalPos.z + diskWorldPos.z
        );

        // Arc path
        const midPoint = new THREE.Vector3(
            (startPos.x + endWorldPos.x) / 2,
            Math.max(startPos.y, endWorldPos.y) + 4,
            (startPos.z + endWorldPos.z) / 2
        );

        // Clear from RAM
        this.ramVisualizer.clearPageMesh(sourceFrame.id);

        // Animate along arc in world coordinates
        const duration = 800;
        const startTime = Date.now();
        const scene = this.scene;
        const diskVisualizer = this.diskVisualizer;

        const animate = () => {
            const elapsed = Date.now() - startTime;
            const t = Math.min(elapsed / duration, 1);

            // Quadratic bezier
            const t1 = 1 - t;
            mesh.position.x = t1 * t1 * startPos.x + 2 * t1 * t * midPoint.x + t * t * endWorldPos.x;
            mesh.position.y = t1 * t1 * startPos.y + 2 * t1 * t * midPoint.y + t * t * endWorldPos.y;
            mesh.position.z = t1 * t1 * startPos.z + 2 * t1 * t * midPoint.z + t * t * endWorldPos.z;

            // Rotate during transfer
            mesh.rotation.y += 0.1;

            if (t < 1) {
                requestAnimationFrame(animate);
            } else {
                // Complete - reparent to disk group with local coordinates
                mesh.rotation.y = 0;
                mesh.material.color.setHex(0x3b82f6);
                mesh.material.emissive.setHex(0x1e40af);

                // Remove from scene and add to disk group
                scene.remove(mesh);
                diskGroup.add(mesh);

                // Set local position within disk group
                mesh.position.copy(targetLocalPos);

                diskVisualizer.setPageMesh(targetBlock.id, mesh);
                diskVisualizer.triggerIOAnimation();

                if (onComplete) onComplete();
            }
        };

        animate();
    }

    /**
     * Animate page transfer from disk to RAM
     */
    animateSwapIn(page, sourceBlock, targetFrame, onComplete) {
        const mesh = this.pageMeshes.get(page.id);
        if (!mesh) return;

        // Get disk group for coordinate transformation
        const diskGroup = this.diskVisualizer.getGroup();
        const diskWorldPos = diskGroup.position.clone();

        // Convert local mesh position to world coordinates for animation start
        const localPos = mesh.position.clone();
        const startPos = new THREE.Vector3(
            localPos.x + diskWorldPos.x,
            localPos.y + diskWorldPos.y,
            localPos.z + diskWorldPos.z
        );

        const endPos = this.ramVisualizer.getFramePosition(targetFrame.id);

        // Remove from disk group, add to scene for animation
        diskGroup.remove(mesh);
        this.scene.add(mesh);
        mesh.position.copy(startPos);

        // Arc path (higher arc for swap in)
        const midPoint = new THREE.Vector3(
            (startPos.x + endPos.x) / 2,
            Math.max(startPos.y, endPos.y) + 6,
            (startPos.z + endPos.z) / 2
        );

        // Clear from disk
        this.diskVisualizer.clearPageMesh(sourceBlock);
        this.diskVisualizer.triggerIOAnimation();

        // Restore original color
        const originalColor = page.color ? new THREE.Color(page.color) :
            new THREE.Color(this.getProcessColor(page.processId));

        const duration = 800;
        const startTime = Date.now();
        const ramVisualizer = this.ramVisualizer;

        const animate = () => {
            const elapsed = Date.now() - startTime;
            const t = Math.min(elapsed / duration, 1);

            // Quadratic bezier
            const t1 = 1 - t;
            mesh.position.x = t1 * t1 * startPos.x + 2 * t1 * t * midPoint.x + t * t * endPos.x;
            mesh.position.y = t1 * t1 * startPos.y + 2 * t1 * t * midPoint.y + t * t * endPos.y;
            mesh.position.z = t1 * t1 * startPos.z + 2 * t1 * t * midPoint.z + t * t * endPos.z;

            // Gradually restore color
            mesh.material.color.lerp(originalColor, t * 0.1);

            // Rotate during transfer
            mesh.rotation.y += 0.1;

            if (t < 1) {
                requestAnimationFrame(animate);
            } else {
                // Complete
                mesh.rotation.y = 0;
                mesh.material.color.copy(originalColor);
                mesh.material.emissive.copy(originalColor);
                mesh.material.emissiveIntensity = 0.1;
                ramVisualizer.setPageMesh(targetFrame.id, mesh);

                if (onComplete) onComplete();
            }
        };

        animate();
    }

    /**
     * Bounce in animation
     */
    animateBounceIn(mesh, targetPos) {
        const duration = 600;
        const startTime = Date.now();
        const startPos = mesh.position.clone();
        const startScale = 0.1;

        const animate = () => {
            const elapsed = Date.now() - startTime;
            const t = Math.min(elapsed / duration, 1);

            // Ease out bounce
            const bounce = this.easeOutBounce(t);

            mesh.position.lerpVectors(startPos, targetPos, bounce);
            const scale = startScale + (1 - startScale) * bounce;
            mesh.scale.set(scale, scale, scale);

            if (t < 1) {
                requestAnimationFrame(animate);
            }
        };

        animate();
    }

    /**
     * Fall down animation
     */
    animateFallDown(mesh, targetPos) {
        const duration = 400;
        const startTime = Date.now();
        const startPos = mesh.position.clone();

        const animate = () => {
            const elapsed = Date.now() - startTime;
            const t = Math.min(elapsed / duration, 1);

            // Ease in fall
            const ease = this.easeInCubic(t);
            mesh.position.lerpVectors(startPos, targetPos, ease);

            if (t < 1) {
                requestAnimationFrame(animate);
            }
        };

        animate();
    }

    /**
     * Highlight page (on access)
     */
    highlightPage(pageId) {
        const mesh = this.pageMeshes.get(pageId);
        if (!mesh) return;

        // Flash effect
        const originalEmissive = mesh.material.emissiveIntensity;
        mesh.material.emissiveIntensity = 0.8;

        setTimeout(() => {
            mesh.material.emissiveIntensity = originalEmissive;
        }, 200);
    }

    /**
     * Remove page mesh
     */
    removePage(pageId) {
        const mesh = this.pageMeshes.get(pageId);
        if (mesh) {
            this.scene.remove(mesh);
            mesh.geometry.dispose();
            mesh.material.dispose();
            this.pageMeshes.delete(pageId);
        }
    }

    /**
     * Easing: ease out bounce
     */
    easeOutBounce(t) {
        const n1 = 7.5625;
        const d1 = 2.75;

        if (t < 1 / d1) {
            return n1 * t * t;
        } else if (t < 2 / d1) {
            return n1 * (t -= 1.5 / d1) * t + 0.75;
        } else if (t < 2.5 / d1) {
            return n1 * (t -= 2.25 / d1) * t + 0.9375;
        } else {
            return n1 * (t -= 2.625 / d1) * t + 0.984375;
        }
    }

    /**
     * Easing: ease in cubic
     */
    easeInCubic(t) {
        return t * t * t;
    }

    /**
     * Clear all pages
     */
    clear() {
        this.pageMeshes.forEach((mesh, pageId) => {
            this.scene.remove(mesh);
            mesh.geometry.dispose();
            mesh.material.dispose();
        });
        this.pageMeshes.clear();
        this.animations = [];
    }

    /**
     * Get page mesh
     */
    getPageMesh(pageId) {
        return this.pageMeshes.get(pageId);
    }
}

// Export for browser
if (typeof window !== 'undefined') {
    window.PageRenderer = PageRenderer;
}
