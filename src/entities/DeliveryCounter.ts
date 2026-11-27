import * as THREE from "three";

export class DeliveryCounter {
    public readonly mesh: THREE.Group;
    public readonly position: THREE.Vector3;
    public readonly halfExtents = { x: 1.35, z: 1.35 };
    private readonly dropZoneOffset = new THREE.Vector3(0, 0, 2.2);
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

        const counterMat = new THREE.MeshStandardMaterial({
            color: 0x16a34a,
            roughness: 0.42,
            metalness: 0.05
        });
        const clothMat = new THREE.MeshStandardMaterial({
            color: 0xfef9c3,
            roughness: 0.72,
            metalness: 0.02
        });
        const topMat = new THREE.MeshStandardMaterial({
            color: 0xdcfce7,
            roughness: 0.35,
            metalness: 0.04
        });
        const accentMat = new THREE.MeshStandardMaterial({
            color: 0x4ade80,
            roughness: 0.35,
            metalness: 0.08
        });

        const base = new THREE.Mesh(
            new THREE.CylinderGeometry(1.22, 1.3, 1.15, 28),
            counterMat
        );
        base.position.y = 0.575;
        base.castShadow = true;
        base.receiveShadow = true;

        // Forro decorativo claro sobre o balcão
        const cloth = new THREE.Mesh(
            new THREE.CylinderGeometry(1.38, 1.4, 0.06, 28),
            clothMat
        );
        cloth.position.y = 1.19;
        cloth.castShadow = true;
        cloth.receiveShadow = true;

        const top = new THREE.Mesh(
            new THREE.CylinderGeometry(1.28, 1.28, 0.14, 28),
            topMat
        );
        top.position.y = 1.27;
        top.castShadow = true;
        top.receiveShadow = true;

        const rim = new THREE.Mesh(
            new THREE.TorusGeometry(1.28, 0.05, 12, 32),
            accentMat
        );
        rim.rotation.x = Math.PI / 2;
        rim.position.y = 1.15;

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

        this.mesh.add(base, cloth, top, rim, this.dropRing);
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
            const bounce = Math.sin(t * Math.PI) * 0.18;
            this.mesh.scale.set(1 + bounce, 1 - bounce * 0.75, 1 + bounce);
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