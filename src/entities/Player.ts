import * as THREE from "three";

export class Player {
    public readonly mesh: THREE.Group;
    public maxStack = 12;
    private speed = 6.5;
    private readonly bodyGroup: THREE.Group;
    private readonly leftArm: THREE.Group;
    private readonly rightArm: THREE.Group;
    private readonly leftFoot: THREE.Mesh;
    private readonly rightFoot: THREE.Mesh;
    private readonly stackContainer: THREE.Group;
    private stack: THREE.Mesh[] = [];
    private swayOffsets: number[] = [];
    private walkPhase = 0;

    constructor() {
        this.mesh = new THREE.Group();
        this.bodyGroup = new THREE.Group();

        const bodyMat = new THREE.MeshStandardMaterial({
            color: 0x2563eb,
            roughness: 0.45,
            metalness: 0.05
        });
        const skinMat = new THREE.MeshStandardMaterial({
            color: 0xffd7b5,
            roughness: 0.5,
            metalness: 0.02
        });
        const capMat = new THREE.MeshStandardMaterial({
            color: 0xef4444,
            roughness: 0.4,
            metalness: 0.05
        });
        const shoeMat = new THREE.MeshStandardMaterial({
            color: 0x1e293b,
            roughness: 0.6,
            metalness: 0.08
        });

        const torso = new THREE.Mesh(
            new THREE.CapsuleGeometry(0.42, 0.45, 12, 24),
            bodyMat
        );
        torso.position.y = 1.02;
        torso.castShadow = true;
        torso.receiveShadow = true;

        const head = new THREE.Mesh(
            new THREE.SphereGeometry(0.42, 24, 24),
            skinMat
        );
        head.scale.set(1.05, 0.96, 1.0);
        head.position.y = 1.92;
        head.castShadow = true;

        const eyeMat = new THREE.MeshStandardMaterial({
            color: 0x0f172a,
            roughness: 0.2
        });
        const leftEye = new THREE.Mesh(new THREE.SphereGeometry(0.065, 12, 12), eyeMat);
        leftEye.position.set(-0.14, 1.94, 0.38);

        const rightEye = new THREE.Mesh(new THREE.SphereGeometry(0.065, 12, 12), eyeMat);
        rightEye.position.set(0.14, 1.94, 0.38);

        const capDome = new THREE.Mesh(
            new THREE.SphereGeometry(0.44, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.55),
            capMat
        );
        capDome.position.set(0, 2.04, 0.02);
        capDome.castShadow = true;

        const capBrim = new THREE.Mesh(
            new THREE.CylinderGeometry(0.44, 0.46, 0.07, 24, 1, false, -Math.PI * 0.45, Math.PI * 0.9),
            capMat
        );
        capBrim.position.set(0, 2.08, 0.14);
        capBrim.castShadow = true;

        // Braço esquerdo
        this.leftArm = new THREE.Group();
        this.leftArm.position.set(-0.54, 1.32, 0);
        const leftSleeve = new THREE.Mesh(
            new THREE.CapsuleGeometry(0.13, 0.28, 8, 16),
            bodyMat
        );
        leftSleeve.position.y = -0.18;
        leftSleeve.castShadow = true;
        const leftHand = new THREE.Mesh(new THREE.SphereGeometry(0.14, 14, 14), skinMat);
        leftHand.position.y = -0.38;
        leftHand.castShadow = true;
        this.leftArm.add(leftSleeve, leftHand);

        // Braço direito
        this.rightArm = new THREE.Group();
        this.rightArm.position.set(0.54, 1.32, 0);
        const rightSleeve = new THREE.Mesh(
            new THREE.CapsuleGeometry(0.13, 0.28, 8, 16),
            bodyMat
        );
        rightSleeve.position.y = -0.18;
        rightSleeve.castShadow = true;
        const rightHand = new THREE.Mesh(new THREE.SphereGeometry(0.14, 14, 14), skinMat);
        rightHand.position.y = -0.38;
        rightHand.castShadow = true;
        this.rightArm.add(rightSleeve, rightHand);

        this.stackContainer = new THREE.Group();
        this.stackContainer.position.set(0, 1.25, -0.58);

        this.bodyGroup.add(
            torso,
            head,
            leftEye,
            rightEye,
            capDome,
            capBrim,
            this.leftArm,
            this.rightArm,
            this.stackContainer
        );

        this.leftFoot = new THREE.Mesh(new THREE.SphereGeometry(0.18, 16, 16), shoeMat);
        this.leftFoot.scale.set(0.9, 0.65, 1.25);
        this.leftFoot.position.set(-0.22, 0.12, 0.04);
        this.leftFoot.castShadow = true;

        this.rightFoot = new THREE.Mesh(new THREE.SphereGeometry(0.18, 16, 16), shoeMat);
        this.rightFoot.scale.set(0.9, 0.65, 1.25);
        this.rightFoot.position.set(0.22, 0.12, 0.04);
        this.rightFoot.castShadow = true;

        this.mesh.add(this.bodyGroup, this.leftFoot, this.rightFoot);
    }

    public getStackCount(): number {
        return this.stack.length;
    }

    public getAvailableSlots(): number {
        return Math.max(0, this.maxStack - this.stack.length);
    }

    public increaseMaxStack(amount = 4): void {
        this.maxStack += amount;
    }

    public increaseSpeed(amount = 1.5): void {
        this.speed += amount;
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

    public popTopPizza(): THREE.Mesh | null {
        const topPizza = this.stack.pop();
        if (!topPizza) return null;
        this.swayOffsets.pop();
        this.stackContainer.remove(topPizza);
        return topPizza;
    }

    public removeFromStack(count: number): number {
        let removed = 0;
        for (let i = 0; i < count; i++) {
            const topPizza = this.popTopPizza();
            if (!topPizza) break;
            removed++;
        }
        return removed;
    }

    update(dt: number, dir: { x: number; z: number }): void {
        const moveMag = Math.hypot(dir.x, dir.z);
        const isMoving = moveMag >= 0.05;
        const carryPose = Math.min(1, this.stack.length / 6) * -0.45;

        if (isMoving) {
            this.mesh.position.x += dir.x * this.speed * dt;
            this.mesh.position.z += dir.z * this.speed * dt;

            const targetAngle = Math.atan2(dir.x, dir.z);
            this.mesh.rotation.y = targetAngle;

            this.walkPhase += dt * (this.speed * 2.1) * Math.min(1.3, moveMag);

            const leftSwing = Math.sin(this.walkPhase);
            const rightSwing = Math.sin(this.walkPhase + Math.PI);

            this.leftFoot.position.z = 0.04 + leftSwing * 0.28;
            this.leftFoot.position.y = 0.12 + Math.max(0, Math.cos(this.walkPhase)) * 0.12;
            this.leftFoot.rotation.x = -leftSwing * 0.35;

            this.rightFoot.position.z = 0.04 + rightSwing * 0.28;
            this.rightFoot.position.y = 0.12 + Math.max(0, Math.cos(this.walkPhase + Math.PI)) * 0.12;
            this.rightFoot.rotation.x = -rightSwing * 0.35;

            this.leftArm.rotation.x = rightSwing * 0.55 + carryPose;
            this.rightArm.rotation.x = leftSwing * 0.55 + carryPose;

            this.bodyGroup.position.y = Math.abs(Math.sin(this.walkPhase)) * 0.07;
            this.bodyGroup.rotation.z = Math.cos(this.walkPhase) * 0.04;
        } else {
            this.walkPhase = 0;
            const blend = Math.min(1, dt * 14);
            this.leftFoot.position.lerp(new THREE.Vector3(-0.22, 0.12, 0.04), blend);
            this.rightFoot.position.lerp(new THREE.Vector3(0.22, 0.12, 0.04), blend);
            this.leftFoot.rotation.x *= 1 - blend;
            this.rightFoot.rotation.x *= 1 - blend;
            this.leftArm.rotation.x += (carryPose - this.leftArm.rotation.x) * blend;
            this.rightArm.rotation.x += (carryPose - this.rightArm.rotation.x) * blend;
            this.bodyGroup.position.y *= 1 - blend;
            this.bodyGroup.rotation.z *= 1 - blend;
        }

        const swayTarget = isMoving ? -0.06 : 0;
        for (let i = 0; i < this.stack.length; i++) {
            const pizza = this.stack[i];
            const weightFactor = (i + 1) / this.maxStack;
            this.swayOffsets[i] +=
                (swayTarget * weightFactor - this.swayOffsets[i]) * Math.min(1, dt * 10);
            pizza.position.z = this.swayOffsets[i];
            pizza.position.x =
                Math.sin(performance.now() * 0.006 + i * 0.4) * 0.015 * weightFactor;
        }
    }
}