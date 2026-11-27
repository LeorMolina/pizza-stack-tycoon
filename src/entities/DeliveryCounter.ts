import * as THREE from "three";

export class DeliveryCounter {
    public readonly mesh: THREE.Group;
    public readonly position: THREE.Vector3;
    public readonly halfExtents = { x: 1.4, z: 1.2 };
    private readonly dropZoneOffset = new THREE.Vector3(0, 0, 2.1);
    private readonly dropRadius = 1.65;
    private readonly deliveryInterval = 0.18;
    private readonly pizzaValue = 15;
    private deliveryTimer = 0;
    private pulseTime = 0;
    private deliveredCount = 0;
    private readonly dropRing: THREE.Mesh;

    constructor(x: number, z: number) {
        this.position = new THREE.Vector3(x, 0, z);
        this.mesh = new THREE.Group();
        this.mesh.position.copy(this.position);

        const redBodyMat = new THREE.MeshStandardMaterial({
            color: 0xdc2626,
            roughness: 0.45,
            metalness: 0.05
        });
        const accentBlueMat = new THREE.MeshStandardMaterial({
            color: 0x0284c7,
            roughness: 0.42,
            metalness: 0.06
        });
        const topMat = new THREE.MeshStandardMaterial({
            color: 0xfef9c3,
            roughness: 0.35,
            metalness: 0.04
        });

        const base = new THREE.Mesh(
            new THREE.BoxGeometry(2.7, 1.05, 1.9),
            redBodyMat
        );
        base.position.y = 0.525;
        base.castShadow = true;
        base.receiveShadow = true;

        const frontTrim = new THREE.Mesh(
            new THREE.BoxGeometry(2.74, 0.22, 1.94),
            accentBlueMat
        );
        frontTrim.position.y = 0.55;
        frontTrim.castShadow = true;

        const top = new THREE.Mesh(
            new THREE.BoxGeometry(2.85, 0.18, 2.05),
            topMat
        );
        top.position.y = 1.14;
        top.castShadow = true;
        top.receiveShadow = true;

        this.dropRing = new THREE.Mesh(
            new THREE.RingGeometry(0.95, 1.25, 32),
            new THREE.MeshBasicMaterial({
                color: 0x22c55e,
                side: THREE.DoubleSide
            })
        );
        this.dropRing.rotation.x = -Math.PI / 2;
        this.dropRing.position.set(
            this.dropZoneOffset.x,
            0.03,
            this.dropZoneOffset.z
        );

        this.mesh.add(base, frontTrim, top, this.dropRing);
    }

    public getDeliveredCount(): number {
        return this.deliveredCount;
    }

    public triggerDeliveryFeedback(): void {
        this.pulseTime = 0.22;
        this.deliveredCount++;
    }

    update(dt: number): void {
        if (this.pulseTime > 0) {
            this.pulseTime = Math.max(0, this.pulseTime - dt);
            const t = 1 - this.pulseTime / 0.22;
            const bounce = Math.sin(t * Math.PI) * 0.16;
            this.mesh.scale.set(1 + bounce, 1 - bounce * 0.7, 1 + bounce);
        } else {
            this.mesh.scale.set(1, 1, 1);
        }

        const pulseScale = 1 + Math.sin(performance.now() * 0.006) * 0.05;
        this.dropRing.scale.set(pulseScale, pulseScale, 1);
    }

    updateDelivery(
        dt: number,
        playerPos: THREE.Vector3,
        playerStackCount: number
    ): { delivered: number; earned: number } {
        const dropWorldX = this.position.x + this.dropZoneOffset.x;
        const dropWorldZ = this.position.z + this.dropZoneOffset.z;
        const dist = Math.hypot(playerPos.x - dropWorldX, playerPos.z - dropWorldZ);

        if (dist > this.dropRadius || playerStackCount <= 0) {
            this.deliveryTimer = 0;
            return { delivered: 0, earned: 0 };
        }

        this.deliveryTimer += dt;
        if (this.deliveryTimer >= this.deliveryInterval) {
            this.deliveryTimer = 0;
            return { delivered: 1, earned: this.pizzaValue };
        }

        return { delivered: 0, earned: 0 };
    }
}