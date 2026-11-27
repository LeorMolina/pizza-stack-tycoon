import * as THREE from "three";

export type CustomerMode = "takeaway" | "dine_in";
export type DineInStage = "going_to_counter" | "going_to_table" | "eating" | "leaving";

export class Customer {
    public readonly mesh: THREE.Group;
    public readonly position: THREE.Vector3;
    public readonly mode: CustomerMode;
    public readonly assignedTableIndex: number | null;
    private readonly targetPos: THREE.Vector3;
    private readonly tablePos: THREE.Vector3 | null;
    private readonly counterPickupPos: THREE.Vector3 | null;
    private readonly bodyGroup: THREE.Group;
    private readonly leftArm: THREE.Group;
    private readonly rightArm: THREE.Group;
    private readonly leftFoot: THREE.Mesh;
    private readonly rightFoot: THREE.Mesh;
    private readonly demandBadge: THREE.Mesh;
    private readonly carryContainer: THREE.Group;
    private walkPhase = 0;
    private eatTimer = 0;
    public dineInStage: DineInStage;
    public desiredPizzas: number;
    public deliveredPizzas = 0;
    public served = false;
    public readyToLeave = false;
    public hasLeftBoxOnTable = false;

    constructor(
        startPos: THREE.Vector3,
        mode: CustomerMode,
        desiredPizzas = 1,
        shirtColor = 0xec4899,
        assignedTableIndex: number | null = null,
        counterPickupPos: THREE.Vector3 | null = null,
        tablePos: THREE.Vector3 | null = null
    ) {
        this.position = startPos.clone();
        this.targetPos = startPos.clone();
        this.mode = mode;
        this.assignedTableIndex = assignedTableIndex;
        this.counterPickupPos = counterPickupPos ? counterPickupPos.clone() : null;
        this.tablePos = tablePos ? tablePos.clone() : null;
        this.desiredPizzas = desiredPizzas;
        this.dineInStage = mode === "dine_in" ? "going_to_counter" : "leaving";

        this.mesh = new THREE.Group();
        this.mesh.position.copy(this.position);
        this.bodyGroup = new THREE.Group();

        const shirtMat = new THREE.MeshStandardMaterial({
            color: shirtColor,
            roughness: 0.45,
            metalness: 0.05
        });
        const skinMat = new THREE.MeshStandardMaterial({
            color: 0xfcd5b5,
            roughness: 0.5,
            metalness: 0.02
        });
        const shoeMat = new THREE.MeshStandardMaterial({
            color: 0x334155,
            roughness: 0.6,
            metalness: 0.08
        });

        const torso = new THREE.Mesh(
            new THREE.CapsuleGeometry(0.38, 0.4, 12, 24),
            shirtMat
        );
        torso.position.y = 0.96;
        torso.castShadow = true;

        const head = new THREE.Mesh(
            new THREE.SphereGeometry(0.38, 24, 24),
            skinMat
        );
        head.position.y = 1.78;
        head.castShadow = true;

        const eyeMat = new THREE.MeshStandardMaterial({
            color: 0x0f172a,
            roughness: 0.2
        });
        const leftEye = new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 12), eyeMat);
        leftEye.position.set(-0.13, 1.8, 0.34);

        const rightEye = new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 12), eyeMat);
        rightEye.position.set(0.13, 1.8, 0.34);

        this.leftArm = new THREE.Group();
        this.leftArm.position.set(-0.48, 1.24, 0);
        const leftSleeve = new THREE.Mesh(
            new THREE.CapsuleGeometry(0.11, 0.24, 8, 16),
            shirtMat
        );
        leftSleeve.position.y = -0.15;
        leftSleeve.castShadow = true;
        const leftHand = new THREE.Mesh(new THREE.SphereGeometry(0.125, 14, 14), skinMat);
        leftHand.position.y = -0.33;
        leftHand.castShadow = true;
        this.leftArm.add(leftSleeve, leftHand);

        this.rightArm = new THREE.Group();
        this.rightArm.position.set(0.48, 1.24, 0);
        const rightSleeve = new THREE.Mesh(
            new THREE.CapsuleGeometry(0.11, 0.24, 8, 16),
            shirtMat
        );
        rightSleeve.position.y = -0.15;
        rightSleeve.castShadow = true;
        const rightHand = new THREE.Mesh(new THREE.SphereGeometry(0.125, 14, 14), skinMat);
        rightHand.position.y = -0.33;
        rightHand.castShadow = true;
        this.rightArm.add(rightSleeve, rightHand);

        this.leftFoot = new THREE.Mesh(new THREE.SphereGeometry(0.16, 16, 16), shoeMat);
        this.leftFoot.scale.set(0.9, 0.65, 1.2);
        this.leftFoot.position.set(-0.2, 0.11, 0.04);
        this.leftFoot.castShadow = true;

        this.rightFoot = new THREE.Mesh(new THREE.SphereGeometry(0.16, 16, 16), shoeMat);
        this.rightFoot.scale.set(0.9, 0.65, 1.2);
        this.rightFoot.position.set(0.2, 0.11, 0.04);
        this.rightFoot.castShadow = true;

        const badgeColor = mode === "dine_in" ? 0x38bdf8 : 0xf59e0b;
        const badgeMat = new THREE.MeshStandardMaterial({
            color: badgeColor,
            roughness: 0.4,
            emissive: 0x1e293b,
            emissiveIntensity: 0.2
        });
        this.demandBadge = new THREE.Mesh(
            new THREE.CylinderGeometry(0.28, 0.28, 0.08, 20),
            badgeMat
        );
        this.demandBadge.position.y = 2.38;

        this.carryContainer = new THREE.Group();
        this.carryContainer.position.set(0, 1.05, 0.52);

        this.bodyGroup.add(
            torso,
            head,
            leftEye,
            rightEye,
            this.leftArm,
            this.rightArm,
            this.demandBadge,
            this.carryContainer
        );
        this.mesh.add(this.bodyGroup, this.leftFoot, this.rightFoot);
    }

    public setTargetPosition(pos: THREE.Vector3): void {
        this.targetPos.copy(pos);
    }

    public getRemainingPizzas(): number {
        return Math.max(0, this.desiredPizzas - this.deliveredPizzas);
    }

    public receiveBox(boxVisual: THREE.Object3D): boolean {
        if (this.served) return false;
        this.deliveredPizzas++;

        boxVisual.position.set(0, (this.carryContainer.children.length) * 0.22, 0);
        boxVisual.rotation.set(0, 0, 0);
        boxVisual.scale.setScalar(0.68);
        this.carryContainer.add(boxVisual);

        const pulse = 1 + this.getRemainingPizzas() * 0.12;
        this.demandBadge.scale.set(pulse, 1, pulse);

        if (this.deliveredPizzas >= this.desiredPizzas) {
            this.served = true;
            this.demandBadge.visible = false;

            if (this.mode === "dine_in" && this.tablePos) {
                this.dineInStage = "going_to_table";
                this.setTargetPosition(new THREE.Vector3(this.tablePos.x, 0, this.tablePos.z - 1.25));
            } else {
                this.readyToLeave = true;
            }
            return true;
        }

        return false;
    }

    public startGoingToCounter(): void {
        if (this.mode === "dine_in" && this.counterPickupPos && this.dineInStage === "going_to_counter") {
            this.setTargetPosition(this.counterPickupPos);
        }
    }

    public extractCarriedBoxForTable(): THREE.Object3D | null {
        if (this.carryContainer.children.length === 0) return null;
        const box = this.carryContainer.children[0];
        this.carryContainer.remove(box);
        return box;
    }

    update(dt: number): void {
        const dx = this.targetPos.x - this.mesh.position.x;
        const dz = this.targetPos.z - this.mesh.position.z;
        const dist = Math.hypot(dx, dz);
        const moveSpeed = 4.2;

        const hasCarried = this.carryContainer.children.length > 0;
        const armHoldLift = hasCarried ? -0.7 : 0;

        if (dist > 0.08) {
            const step = Math.min(dist, moveSpeed * dt);
            this.mesh.position.x += (dx / dist) * step;
            this.mesh.position.z += (dz / dist) * step;
            this.position.copy(this.mesh.position);

            const angle = Math.atan2(dx, dz);
            this.mesh.rotation.y = angle;

            this.walkPhase += dt * 11;
            const swing = Math.sin(this.walkPhase);

            this.leftFoot.position.z = 0.04 + swing * 0.22;
            this.rightFoot.position.z = 0.04 - swing * 0.22;
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

            if (this.mode === "dine_in" && this.dineInStage === "going_to_table") {
                this.dineInStage = "eating";
                this.eatTimer = 3.5;
                this.hasLeftBoxOnTable = true;

                if (this.tablePos) {
                    this.mesh.rotation.y = Math.atan2(
                        this.tablePos.x - this.mesh.position.x,
                        this.tablePos.z - this.mesh.position.z
                    );
                }
            } else if (this.mode === "dine_in" && this.dineInStage === "eating") {
                this.eatTimer -= dt;
                this.bodyGroup.position.y = Math.abs(Math.sin(performance.now() * 0.008)) * 0.03;
                if (this.eatTimer <= 0) {
                    this.dineInStage = "leaving";
                    this.readyToLeave = true;
                }
            }
        }

        if (!this.served) {
            this.demandBadge.position.y = 2.38 + Math.sin(performance.now() * 0.005) * 0.06;
        }
    }
}