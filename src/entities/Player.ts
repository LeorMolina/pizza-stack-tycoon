import * as THREE from "three";

export class Player {
    public readonly mesh: THREE.Group;
    private readonly speed = 6.5;

    constructor() {
        this.mesh = new THREE.Group();

        const bodyMat = new THREE.MeshStandardMaterial({ color: 0x2563eb });
        const headMat = new THREE.MeshStandardMaterial({ color: 0x1e293b });
        const capMat = new THREE.MeshStandardMaterial({ color: 0xef4444 });

        const torso = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.1, 0.6), bodyMat);
        torso.position.y = 1.05;
        torso.castShadow = true;

        const head = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.7, 0.7), headMat);
        head.position.y = 2.0;
        head.castShadow = true;

        const cap = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.22, 0.9), capMat);
        cap.position.set(0, 2.38, 0.08);
        cap.castShadow = true;

        this.mesh.add(torso, head, cap);
    }

    update(dt: number, dir: { x: number; z: number }): void {
        if (Math.hypot(dir.x, dir.z) < 0.05) return;

        this.mesh.position.x += dir.x * this.speed * dt;
        this.mesh.position.z += dir.z * this.speed * dt;

        const targetAngle = Math.atan2(dir.x, dir.z);
        this.mesh.rotation.y = targetAngle;
    }
}