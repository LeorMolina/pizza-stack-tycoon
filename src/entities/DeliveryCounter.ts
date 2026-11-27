import * as THREE from "three";

export class DeliveryCounter {
    public readonly mesh: THREE.Group;
    public readonly position: THREE.Vector3;
    public readonly halfExtents = { x: 1.5, z: 1.0 };
    private readonly dropRadius = 2.6;
    private readonly dropInterval = 0.18;
    private readonly pricePerPizza = 15;
    private timer = 0;
    private pulseTime = 0;
    private deliveredCount = 0;

    constructor(x: number, z: number) {
        this.position = new THREE.Vector3(x, 0, z);
        this.mesh = new THREE.Group();
        this.mesh.position.copy(this.position);

        const counterMat = new THREE.MeshStandardMaterial({ color: 0x16a34a });
        const topMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc });
        const zoneMat = new THREE.MeshStandardMaterial({
            color: 0x22c55e,
            transparent: true,
            opacity: 0.35
        });

        const base = new THREE.Mesh(new THREE.BoxGeometry(2.8, 1.2, 1.8), counterMat);
        base.position.y = 0.6;
        base.castShadow = true;
        base.receiveShadow = true;

        const top = new THREE.Mesh(new THREE.BoxGeometry(3.0, 0.2, 2.0), topMat);
        top.position.y = 1.3;
        top.castShadow = true;
        top.receiveShadow = true;

        const dropZone = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, 0.06, 24), zoneMat);
        dropZone.position.set(0, 0.03, 1.8);
        dropZone.receiveShadow = true;

        this.mesh.add(base, top, dropZone);
    }

    public triggerDeliveryFeedback(): void {
        this.pulseTime = 0.22;
        this.deliveredCount++;
    }

    update(dt: number): void {
        if (this.pulseTime > 0) {
            this.pulseTime = Math.max(0, this.pulseTime - dt);
            const t = 1 - this.pulseTime / 0.22;
            const bounce = Math.sin(t * Math.PI) * 0.18;
            this.mesh.scale.set(1 + bounce, 1 - bounce * 0.75, 1 + bounce);
        } else {
            this.mesh.scale.set(1, 1, 1);
        }
    }

    updateDelivery(dt: number, playerPos: THREE.Vector3, playerStackCount: number): { delivered: number; earned: number } {
        if (playerStackCount <= 0) {
            this.timer = 0;
            return { delivered: 0, earned: 0 };
        }

        const zoneX = this.position.x;
        const zoneZ = this.position.z + 1.8;
        const dist = Math.hypot(playerPos.x - zoneX, playerPos.z - zoneZ);

        if (dist > this.dropRadius) {
            this.timer = 0;
            return { delivered: 0, earned: 0 };
        }

        this.timer += dt;
        if (this.timer >= this.dropInterval) {
            this.timer = 0;
            return { delivered: 1, earned: this.pricePerPizza };
        }

        return { delivered: 0, earned: 0 };
    }
}