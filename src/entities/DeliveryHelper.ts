import * as THREE from "three";
import { PizzaStation } from "./PizzaStation";
import { DeliveryCounter } from "./DeliveryCounter";

export type CounterTarget = "table" | "delivery";

export class DeliveryHelper {
    public readonly mesh: THREE.Group;
    public readonly position: THREE.Vector3;
    private readonly bodyGroup: THREE.Group;
    private readonly leftArm: THREE.Group;
    private readonly rightArm: THREE.Group;
    private readonly leftFoot: THREE.Mesh;
    private readonly rightFoot: THREE.Mesh;
    private readonly carryStack: THREE.Group;
    private readonly carriedPizzas: THREE.Mesh[] = [];
    private activeTarget: CounterTarget = "table";
    private walkPhase = 0;
    private dropCooldown = 0;
    private hired = false;
    private moveSpeed = 3.3;
    private maxCarry = 2;

    constructor(x: number, z: number) {
        this.position = new THREE.Vector3(x, 0, z);

        this.mesh = new THREE.Group();
        this.mesh.position.copy(this.position);
        this.mesh.visible = false;

        this.bodyGroup = new THREE.Group();

        const shirtMat = new THREE.MeshStandardMaterial({
            color: 0xdc2626,
            roughness: 0.45,
            metalness: 0.05
        });
        const apronMat = new THREE.MeshStandardMaterial({
            color: 0xfef3c7,
            roughness: 0.5,
            metalness: 0.02
        });
        const capMat = new THREE.MeshStandardMaterial({
            color: 0x991b1b,
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
        this.carryStack.position.set(0, 1.05, 0.5);

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
        this.moveSpeed += 0.65;
        this.maxCarry += 1;
    }

    public update(
        dt: number,
        station: PizzaStation,
        tableCounter: DeliveryCounter,
        deliveryCounter: DeliveryCounter,
        tableBoxesCount: number,
        deliveryBoxesCount: number
    ): { target: CounterTarget; startWorld: THREE.Vector3 } | null {
        if (!this.hired) return null;

        this.dropCooldown = Math.max(0, this.dropCooldown - dt);
        const runnerStockCap = 4;

        const pickupSpot = new THREE.Vector3(
            station.position.x + 1.65,
            0,
            station.position.z - 1.35
        );

        const availableSlots = Math.max(0, this.maxCarry - this.carriedPizzas.length);
        if (availableSlots > 0) {
            const collected = station.collectPizzasForPlayer(this.mesh.position, availableSlots);
            for (const pizza of collected) {
                pizza.position.set(0, this.carriedPizzas.length * 0.16, 0);
                pizza.rotation.set(0, 0, 0);
                this.carryStack.add(pizza);
                this.carriedPizzas.push(pizza);
            }
            if (collected.length > 0) {
                this.activeTarget = tableBoxesCount <= deliveryBoxesCount ? "table" : "delivery";
            }
        }

        const canStockTable = tableBoxesCount < runnerStockCap;
        const canStockDelivery = deliveryBoxesCount < runnerStockCap;

        if (this.activeTarget === "table" && !canStockTable && canStockDelivery) {
            this.activeTarget = "delivery";
        } else if (this.activeTarget === "delivery" && !canStockDelivery && canStockTable) {
            this.activeTarget = "table";
        }

        const targetCounterObj =
            this.activeTarget === "table" ? tableCounter : deliveryCounter;
        const canDropAtActive =
            this.activeTarget === "table" ? canStockTable : canStockDelivery;

        const dropSpot = new THREE.Vector3(
            targetCounterObj.position.x - 0.85,
            0,
            targetCounterObj.position.z - 1.55
        );

        const goingToCounter = this.carriedPizzas.length > 0 && (canStockTable || canStockDelivery);
        const targetPos = goingToCounter ? dropSpot : pickupSpot;

        const dx = targetPos.x - this.mesh.position.x;
        const dz = targetPos.z - this.mesh.position.z;
        const dist = Math.hypot(dx, dz);
        const armHoldLift = this.carriedPizzas.length > 0 ? -0.75 : 0;

        if (dist > 0.12) {
            const step = Math.min(dist, this.moveSpeed * dt);
            this.mesh.position.x += (dx / dist) * step;
            this.mesh.position.z += (dz / dist) * step;
            this.position.copy(this.mesh.position);

            this.mesh.rotation.y = Math.atan2(dx, dz);
            this.walkPhase += dt * 11;
            const swing = Math.sin(this.walkPhase);

            this.leftFoot.position.z = 0.04 + swing * 0.2;
            this.rightFoot.position.z = 0.04 - swing * 0.2;
            this.leftArm.rotation.x = -swing * 0.45 + armHoldLift;
            this.rightArm.rotation.x = swing * 0.45 + armHoldLift;
            this.bodyGroup.position.y = Math.abs(swing) * 0.05;
            return null;
        }

        this.position.copy(this.mesh.position);
        this.leftFoot.position.z = 0.04;
        this.rightFoot.position.z = 0.04;
        this.leftArm.rotation.x = armHoldLift;
        this.rightArm.rotation.x = armHoldLift;
        this.bodyGroup.position.y = 0;

        if (goingToCounter) {
            this.mesh.rotation.y = Math.atan2(
                targetCounterObj.position.x - this.mesh.position.x,
                targetCounterObj.position.z - this.mesh.position.z
            );

            if (canDropAtActive && this.dropCooldown <= 0 && this.carriedPizzas.length > 0) {
                const topPizza = this.carriedPizzas.pop()!;
                const startWorld = new THREE.Vector3();
                topPizza.getWorldPosition(startWorld);
                this.carryStack.remove(topPizza);
                this.dropCooldown = 0.26;
                return {
                    target: this.activeTarget,
                    startWorld
                };
            }
        } else {
            this.mesh.rotation.y = Math.atan2(
                station.position.x + 1.65 - this.mesh.position.x,
                station.position.z + 0.25 - this.mesh.position.z
            );
        }

        return null;
    }
}