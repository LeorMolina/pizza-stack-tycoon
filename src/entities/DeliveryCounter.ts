import * as THREE from "three";

export class DeliveryCounter {
    public readonly mesh: THREE.Group;
    public readonly position: THREE.Vector3;
    public readonly halfExtents = { x: 1.35, z: 0.75 };
    private readonly ringMesh: THREE.Mesh;
    private readonly dropZoneOffset = new THREE.Vector3(0, 0.03, -1.55);
    private readonly dropRadius = 1.45;
    private readonly dropInterval = 0.16;
    private readonly baseReward: number;
    private dropTimer = 0;
    private pulseTime = 0;

    constructor(x: number, z: number, accentColor = 0x16a34a, baseReward = 15) {
        this.position = new THREE.Vector3(x, 0, z);
        this.baseReward = baseReward;

        this.mesh = new THREE.Group();
        this.mesh.position.copy(this.position);

        const baseMat = new THREE.MeshStandardMaterial({
            color: 0xf8fafc,
            roughness: 0.5,
            metalness: 0.03
        });
        const accentMat = new THREE.MeshStandardMaterial({
            color: accentColor,
            roughness: 0.42,
            metalness: 0.05
        });
        const topMat = new THREE.MeshStandardMaterial({
            color: 0xfffbeb,
            roughness: 0.35,
            metalness: 0.03
        });

        const body = new THREE.Mesh(
            new THREE.BoxGeometry(2.6, 1.05, 1.4),
            baseMat
        );
        body.position.y = 0.525;
        body.castShadow = true;
        body.receiveShadow = true;

        const stripe = new THREE.Mesh(
            new THREE.BoxGeometry(2.66, 0.22, 1.46),
            accentMat
        );
        stripe.position.y = 0.65;
        stripe.castShadow = true;

        const top = new THREE.Mesh(
            new THREE.BoxGeometry(2.74, 0.14, 1.54),
            topMat
        );
        top.position.y = 1.12;
        top.castShadow = true;
        top.receiveShadow = true;

        const totemPost = new THREE.Mesh(
            new THREE.CylinderGeometry(0.06, 0.06, 0.55, 12),
            accentMat
        );
        totemPost.position.set(-1.12, 1.42, 0.45);
        totemPost.castShadow = true;

        const totemBadge = new THREE.Mesh(
            new THREE.BoxGeometry(0.36, 0.28, 0.12),
            accentMat
        );
        totemBadge.position.set(-1.12, 1.72, 0.45);
        totemBadge.castShadow = true;

        this.ringMesh = new THREE.Mesh(
            new THREE.RingGeometry(1.12, 1.38, 32),
            new THREE.MeshBasicMaterial({
                color: accentColor,
                side: THREE.DoubleSide
            })
        );
        this.ringMesh.rotation.x = -Math.PI / 2;
        this.ringMesh.position.copy(this.dropZoneOffset);

        this.mesh.add(body, stripe, top, totemPost, totemBadge, this.ringMesh);
    }

    public triggerDeliveryFeedback(): void {
        this.pulseTime = 0.2;
    }

    public update(dt: number): void {
        if (this.pulseTime > 0) {
            this.pulseTime = Math.max(0, this.pulseTime - dt);
            const t = 1 - this.pulseTime / 0.2;
            const bounce = Math.sin(t * Math.PI) * 0.08;
            this.mesh.scale.set(1 + bounce, 1 - bounce * 0.5, 1 + bounce);
        } else {
            this.mesh.scale.set(1, 1, 1);
        }

        const ringPulse = 1 + Math.sin(performance.now() * 0.006) * 0.04;
        this.ringMesh.scale.set(ringPulse, ringPulse, 1);
    }

    public updateDelivery(
        dt: number,
        playerPos: THREE.Vector3,
        availableStackCount: number
    ): { delivered: number; earned: number } {
        if (availableStackCount <= 0) {
            this.dropTimer = 0;
            return { delivered: 0, earned: 0 };
        }

        const zoneX = this.position.x + this.dropZoneOffset.x;
        const zoneZ = this.position.z + this.dropZoneOffset.z;
        const dist = Math.hypot(playerPos.x - zoneX, playerPos.z - zoneZ);

        if (dist > this.dropRadius) {
            this.dropTimer = 0;
            return { delivered: 0, earned: 0 };
        }

        this.dropTimer += dt;
        if (this.dropTimer >= this.dropInterval) {
            this.dropTimer = 0;
            return { delivered: 1, earned: this.baseReward };
        }

        return { delivered: 0, earned: 0 };
    }
}