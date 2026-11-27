import * as THREE from "three";

export class TrashBin {
    public readonly mesh: THREE.Group;
    public readonly position: THREE.Vector3;
    public readonly radius = 0.85;
    public readonly dropRadius = 2.4;
    private pulseTime = 0;

    constructor(x: number, z: number) {
        this.position = new THREE.Vector3(x, 0, z);
        this.mesh = new THREE.Group();
        this.mesh.position.copy(this.position);

        const bodyMat = new THREE.MeshStandardMaterial({
            color: 0x2563eb,
            roughness: 0.45,
            metalness: 0.06
        });
        const lidMat = new THREE.MeshStandardMaterial({
            color: 0xef4444,
            roughness: 0.42,
            metalness: 0.06
        });
        const rimMat = new THREE.MeshStandardMaterial({
            color: 0x1e293b,
            roughness: 0.5,
            metalness: 0.1
        });

        const body = new THREE.Mesh(
            new THREE.CylinderGeometry(0.68, 0.58, 1.15, 24),
            bodyMat
        );
        body.position.y = 0.575;
        body.castShadow = true;
        body.receiveShadow = true;

        const rim = new THREE.Mesh(
            new THREE.CylinderGeometry(0.74, 0.74, 0.12, 24),
            lidMat
        );
        rim.position.y = 1.18;
        rim.castShadow = true;

        const lidTop = new THREE.Mesh(
            new THREE.BoxGeometry(0.85, 0.14, 0.85),
            lidMat
        );
        lidTop.position.y = 1.28;
        lidTop.castShadow = true;

        const slot = new THREE.Mesh(
            new THREE.BoxGeometry(0.5, 0.05, 0.25),
            rimMat
        );
        slot.position.y = 1.355;

        this.mesh.add(body, rim, lidTop, slot);
    }

    public triggerFeedback(): void {
        this.pulseTime = 0.22;
    }

    public update(dt: number): void {
        if (this.pulseTime > 0) {
            this.pulseTime = Math.max(0, this.pulseTime - dt);
            const t = 1 - this.pulseTime / 0.22;
            const bounce = Math.sin(t * Math.PI) * 0.16;
            this.mesh.scale.set(1 + bounce, 1 - bounce * 0.7, 1 + bounce);
        } else {
            this.mesh.scale.set(1, 1, 1);
        }
    }
}