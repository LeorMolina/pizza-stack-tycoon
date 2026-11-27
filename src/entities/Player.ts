import * as THREE from "three";

export class Player {
    public readonly mesh: THREE.Group;
    private readonly speed = 6.5;
    private readonly maxStack = 12;
    private readonly stackContainer: THREE.Group;
    private stack: THREE.Mesh[] = [];
    private swayOffsets: number[] = [];

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

        this.stackContainer = new THREE.Group();
        this.stackContainer.position.set(0, 1.35, -0.55);

        this.mesh.add(torso, head, cap, this.stackContainer);
    }

    public getAvailableSlots(): number {
        return Math.max(0, this.maxStack - this.stack.length);
    }

    public addToStack(pizzas: THREE.Mesh[]): void {
        for (const pizza of pizzas) {
            if (this.stack.length >= this.maxStack) break;
            const index = this.stack.length;
            pizza.position.set(0, index * 0.16, 0);
            pizza.rotation.set(0, 0, 0);
            this.stackContainer.add(pizza);
            this.stack.push(pizza);
            this.swayOffsets.push(0);
        }
    }

    update(dt: number, dir: { x: number; z: number }): void {
        const moveMag = Math.hypot(dir.x, dir.z);
        if (moveMag >= 0.05) {
            this.mesh.position.x += dir.x * this.speed * dt;
            this.mesh.position.z += dir.z * this.speed * dt;

            const targetAngle = Math.atan2(dir.x, dir.z);
            this.mesh.rotation.y = targetAngle;
        }

        // Efeito sutil de balanço na pilha conforme o nível da pizza
        const swayTarget = moveMag >= 0.05 ? -0.06 : 0;
        for (let i = 0; i < this.stack.length; i++) {
            const pizza = this.stack[i];
            const weightFactor = (i + 1) / this.maxStack;
            this.swayOffsets[i] += (swayTarget * weightFactor - this.swayOffsets[i]) * Math.min(1, dt * 10);
            pizza.position.z = this.swayOffsets[i];
            pizza.position.x = Math.sin(performance.now() * 0.006 + i * 0.4) * 0.015 * weightFactor;
        }
    }
}