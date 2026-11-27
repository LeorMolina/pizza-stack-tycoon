import * as THREE from "three";
import { DiningTable } from "./DiningTable";
import { TrashBin } from "./TrashBin";
import { PizzaStation } from "./PizzaStation";

export class Helper {
    public readonly mesh: THREE.Group;
    public readonly position: THREE.Vector3;
    private readonly homePos: THREE.Vector3;
    private readonly bodyGroup: THREE.Group;
    private readonly leftArm: THREE.Group;
    private readonly rightArm: THREE.Group;
    private readonly leftFoot: THREE.Mesh;
    private readonly rightFoot: THREE.Mesh;
    private readonly carryStack: THREE.Group;
    private walkPhase = 0;
    private hired = false;
    private moveSpeed = 3.4;
    private maxCarry = 2;
    private carryCount = 0;

    constructor(x: number, z: number) {
        this.position = new THREE.Vector3(x, 0, z);
        this.homePos = new THREE.Vector3(x, 0, z);

        this.mesh = new THREE.Group();
        this.mesh.position.copy(this.position);
        this.mesh.visible = false;

        this.bodyGroup = new THREE.Group();

        const shirtMat = new THREE.MeshStandardMaterial({
            color: 0x059669,
            roughness: 0.45,
            metalness: 0.05
        });
        const apronMat = new THREE.MeshStandardMaterial({
            color: 0xf8fafc,
            roughness: 0.5,
            metalness: 0.02
        });
        const capMat = new THREE.MeshStandardMaterial({
            color: 0x047857,
            roughness: 0.4
        });
        const skinMat = new THREE.MeshStandardMaterial({
            color: 0xfcd5b5,
            roughness: 0.5,
            metalness: 0.02
        });
        const shoeMat = new THREE.MeshStandardMaterial({
            color: 0x1e293b,
            roughness: 0.6
        });

        const torso = new THREE.Mesh(
            new THREE.CapsuleGeometry(0.36, 0.38, 12, 24),
            shirtMat
        );
        torso.position.y = 0.94;
        torso.castShadow = true;

        const apron = new THREE.Mesh(
            new THREE.BoxGeometry(0.46, 0.48, 0.12),
            apronMat
        );
        apron.position.set(0, 0.88, 0.33);
        apron.castShadow = true;

        const head = new THREE.Mesh(
            new THREE.SphereGeometry(0.36, 24, 24),
            skinMat
        );
        head.position.y = 1.74;
        head.castShadow = true;

        const capDome = new THREE.Mesh(
            new THREE.SphereGeometry(0.37, 20, 16, 0, Math.PI * 2, 0, Math.PI * 0.52),
            capMat
        );
        capDome.position.y = 1.77;
        capDome.castShadow = true;

        const capVisor = new THREE.Mesh(
            new THREE.BoxGeometry(0.34, 0.05, 0.24),
            capMat
        );
        capVisor.position.set(0, 1.84, 0.34);

        const eyeMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.2 });
        const leftEye = new THREE.Mesh(new THREE.SphereGeometry(0.055, 12, 12), eyeMat);
        leftEye.position.set(-0.12, 1.75, 0.33);

        const rightEye = new THREE.Mesh(new THREE.SphereGeometry(0.055, 12, 12), eyeMat);
        rightEye.position.set(0.12, 1.75, 0.33);

        this.leftArm = new THREE.Group();
        this.leftArm.position.set(-0.46, 1.2, 0);
        const leftSleeve = new THREE.Mesh(new THREE.CapsuleGeometry(0.1, 0.22, 8, 16), shirtMat);
        leftSleeve.position.y = -0.14;
        const leftHand = new THREE.Mesh(new THREE.SphereGeometry(0.115, 14, 14), skinMat);
        leftHand.position.y = -0.31;
        this.leftArm.add(leftSleeve, leftHand);

        this.rightArm = new THREE.Group();
        this.rightArm.position.set(0.46, 1.2, 0);
        const rightSleeve = new THREE.Mesh(new THREE.CapsuleGeometry(0.1, 0.22, 8, 16), shirtMat);
        rightSleeve.position.y = -0.14;
        const rightHand = new THREE.Mesh(new THREE.SphereGeometry(0.115, 14, 14), skinMat);
        rightHand.position.y = -0.31;
        this.rightArm.add(rightSleeve, rightHand);

        this.leftFoot = new THREE.Mesh(new THREE.SphereGeometry(0.15, 16, 16), shoeMat);
        this.leftFoot.scale.set(0.9, 0.65, 1.2);
        this.leftFoot.position.set(-0.19, 0.1, 0.04);

        this.rightFoot = new THREE.Mesh(new THREE.SphereGeometry(0.15, 16, 16), shoeMat);
        this.rightFoot.scale.set(0.9, 0.65, 1.2);
        this.rightFoot.position.set(0.19, 0.1, 0.04);

        this.carryStack = new THREE.Group();
        this.carryStack.position.set(0, 1.02, 0.5);

        this.bodyGroup.add(
            torso,
            apron,
            head,
            capDome,
            capVisor,
            leftEye,
            rightEye,
            this.leftArm,
            this.rightArm,
            this.carryStack
        );
        this.mesh.add(this.bodyGroup, this.leftFoot, this.rightFoot);
    }

    public isHired(): boolean {
        return this.hired;
    }

    public hire(): void {
        this.hired = true;
        this.mesh.visible = true;
    }

    public upgrade(): void {
        this.moveSpeed += 0.7;
        this.maxCarry += 1;
    }

    private findNearestDirtyTable(tables: DiningTable[]): DiningTable | null {
        let nearest: DiningTable | null = null;
        let bestDist = Infinity;

        for (const table of tables) {
            if (!table.isAvailable()) {
                const dist = this.position.distanceTo(table.position);
                if (dist < bestDist) {
                    bestDist = dist;
                    nearest = table;
                }
            }
        }

        return nearest;
    }

    private avoidTables(tables: DiningTable[]): void {
        const helperRadius = 0.5;
        for (const table of tables) {
            const dx = this.mesh.position.x - table.position.x;
            const dz = this.mesh.position.z - table.position.z;
            const minDist = helperRadius + table.radius;
            const distSq = dx * dx + dz * dz;

            if (distSq < minDist * minDist) {
                const dist = Math.sqrt(distSq) || 0.0001;
                const overlap = minDist - dist;
                this.mesh.position.x += (dx / dist) * overlap;
                this.mesh.position.z += (dz / dist) * overlap;
            }
        }
    }

    public update(dt: number, tables: DiningTable[], trashBin: TrashBin): void {
        if (!this.hired) return;

        if (this.carryCount < this.maxCarry) {
            for (const table of tables) {
                if (this.carryCount >= this.maxCarry) break;
                if (table.tryPickupEmptyBox(this.mesh.position)) {
                    const trashBox = PizzaStation.createPizzaBoxMesh();
                    trashBox.scale.setScalar(0.6);
                    trashBox.position.set(0, this.carryCount * 0.18, 0);
                    this.carryStack.add(trashBox);
                    this.carryCount++;
                }
            }
        }

        let targetPos = this.homePos;
        const dirtyTable = this.findNearestDirtyTable(tables);

        if (this.carryCount >= this.maxCarry || (this.carryCount > 0 && !dirtyTable)) {
            targetPos = new THREE.Vector3(
                trashBin.position.x - 1.1,
                0,
                trashBin.position.z + 1.1
            );
        } else if (dirtyTable) {
            targetPos = new THREE.Vector3(
                dirtyTable.position.x,
                0,
                dirtyTable.position.z - 1.45
            );
        }

        const dx = targetPos.x - this.mesh.position.x;
        const dz = targetPos.z - this.mesh.position.z;
        const dist = Math.hypot(dx, dz);
        const armHoldLift = this.carryCount > 0 ? -0.75 : 0;

        if (dist > 0.12) {
            const step = Math.min(dist, this.moveSpeed * dt);
            this.mesh.position.x += (dx / dist) * step;
            this.mesh.position.z += (dz / dist) * step;
            this.avoidTables(tables);
            this.position.copy(this.mesh.position);

            this.mesh.rotation.y = Math.atan2(dx, dz);
            this.walkPhase += dt * 11;
            const swing = Math.sin(this.walkPhase);

            this.leftFoot.position.z = 0.04 + swing * 0.2;
            this.rightFoot.position.z = 0.04 - swing * 0.2;
            this.leftArm.rotation.x = -swing * 0.45 + armHoldLift;
            this.rightArm.rotation.x = swing * 0.45 + armHoldLift;
            this.bodyGroup.position.y = Math.abs(swing) * 0.05;
        } else {
            this.position.copy(this.mesh.position);
            this.leftFoot.position.z = 0.04;
            this.rightFoot.position.z = 0.04;
            this.leftArm.rotation.x = armHoldLift;
            this.rightArm.rotation.x = armHoldLift;
            this.bodyGroup.position.y = 0;

            if (targetPos === this.homePos) {
                this.mesh.rotation.y = 0;
            }
        }

        if (this.carryCount > 0) {
            const distToBin = Math.hypot(
                this.mesh.position.x - trashBin.position.x,
                this.mesh.position.z - trashBin.position.z
            );
            if (distToBin <= 2.4) {
                this.carryCount = 0;
                this.carryStack.clear();
                trashBin.triggerFeedback();
            }
        }
    }
}