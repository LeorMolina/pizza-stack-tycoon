import * as THREE from "three";
import { DiningTable } from "../entities/DiningTable";
import { PizzaStation } from "../entities/PizzaStation";

type CustomerState =
    | "entering"
    | "to_queue"
    | "in_queue"
    | "to_table"
    | "eating"
    | "exiting";

interface Customer {
    mesh: THREE.Group;
    leftLeg: THREE.Mesh;
    rightLeg: THREE.Mesh;
    leftArm: THREE.Mesh;
    rightArm: THREE.Mesh;
    state: CustomerState;
    mode: "dine_in" | "takeaway";
    target: THREE.Vector3;
    table?: DiningTable;
    carriedBox?: THREE.Object3D;
    eatTimer: number;
    walkPhase: number;
}

export class CustomerSystem {
    private readonly scene: THREE.Scene;
    private readonly tableCounterPos: THREE.Vector3;
    private readonly deliveryCounterPos: THREE.Vector3;
    private readonly tables: DiningTable[];
    private readonly reservedTables = new Set<DiningTable>();
    private readonly doorWaypoint = new THREE.Vector3(-1.5, 0, 10.2);
    private readonly customers: Customer[] = [];
    private spawnTimer = 1.2;
    private readonly maxCustomers = 8;
    private servedTotal = 0;

    private readonly shirtColors = [0x0ea5e9, 0x8b5cf6, 0xec4899, 0xf59e0b, 0x10b981, 0x6366f1];
    private readonly pantsColors = [0x1e293b, 0x334155, 0x1e3a8a, 0x3f3f46];

    constructor(
        scene: THREE.Scene,
        tableCounterPos: THREE.Vector3,
        deliveryCounterPos: THREE.Vector3,
        tables: DiningTable[]
    ) {
        this.scene = scene;
        this.tableCounterPos = tableCounterPos;
        this.deliveryCounterPos = deliveryCounterPos;
        this.tables = tables;
    }

    public getServedTotal(): number {
        return this.servedTotal;
    }

    public setServedTotal(total: number): void {
        this.servedTotal = Math.max(0, Math.floor(total));
    }

    public getCustomerPositions(): THREE.Vector3[] {
        return this.customers.map((c) => c.mesh.position);
    }

    private getSpawnInterval(level: number): number {
        return Math.max(1.4, 3.2 - (level - 1) * 0.25);
    }

    private getPayoutMultiplier(level: number): number {
        return 1 + (level - 1) * 0.12;
    }

    private createCustomerMesh(): {
        group: THREE.Group;
        leftLeg: THREE.Mesh;
        rightLeg: THREE.Mesh;
        leftArm: THREE.Mesh;
        rightArm: THREE.Mesh;
    } {
        const group = new THREE.Group();
        const shirtColor = this.shirtColors[Math.floor(Math.random() * this.shirtColors.length)];
        const pantsColor = this.pantsColors[Math.floor(Math.random() * this.pantsColors.length)];

        const shirtMat = new THREE.MeshStandardMaterial({ color: shirtColor, roughness: 0.45 });
        const pantsMat = new THREE.MeshStandardMaterial({ color: pantsColor, roughness: 0.6 });
        const skinMat = new THREE.MeshStandardMaterial({ color: 0xfdba74, roughness: 0.4 });

        const legGeo = new THREE.CylinderGeometry(0.11, 0.11, 0.42, 10);
        const leftLeg = new THREE.Mesh(legGeo, pantsMat);
        leftLeg.position.set(-0.14, 0.21, 0);
        leftLeg.castShadow = true;

        const rightLeg = new THREE.Mesh(legGeo, pantsMat);
        rightLeg.position.set(0.14, 0.21, 0);
        rightLeg.castShadow = true;

        const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.3, 0.56, 12), shirtMat);
        torso.position.y = 0.68;
        torso.castShadow = true;

        const armGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.44, 10);
        const leftArm = new THREE.Mesh(armGeo, shirtMat);
        leftArm.position.set(-0.36, 0.72, 0);
        leftArm.castShadow = true;

        const rightArm = new THREE.Mesh(armGeo, shirtMat);
        rightArm.position.set(0.36, 0.72, 0);
        rightArm.castShadow = true;

        const head = new THREE.Mesh(new THREE.SphereGeometry(0.25, 12, 12), skinMat);
        head.position.y = 1.22;
        head.castShadow = true;

        group.add(leftLeg, rightLeg, torso, leftArm, rightArm, head);
        group.scale.setScalar(1.28);
        return { group, leftLeg, rightLeg, leftArm, rightArm };
    }

    private getQueue(mode: "dine_in" | "takeaway"): Customer[] {
        return this.customers.filter(
            (c) => c.mode === mode && (c.state === "to_queue" || c.state === "in_queue")
        );
    }

    private getQueueSlotPosition(mode: "dine_in" | "takeaway", index: number): THREE.Vector3 {
        const base = mode === "dine_in" ? this.tableCounterPos : this.deliveryCounterPos;
        return new THREE.Vector3(base.x, 0, base.z + 1.65 + index * 1.15);
    }

    private spawnCustomer(): void {
        const { group, leftLeg, rightLeg, leftArm, rightArm } = this.createCustomerMesh();
        const dineInQueue = this.getQueue("dine_in");
        const takeawayQueue = this.getQueue("takeaway");
        const mode: "dine_in" | "takeaway" =
            dineInQueue.length <= takeawayQueue.length ? "dine_in" : "takeaway";

        const startX = -5.5 + Math.random() * 10.0;
        group.position.set(startX, 0, 14.5);
        this.scene.add(group);

        const customer: Customer = {
            mesh: group,
            leftLeg,
            rightLeg,
            leftArm,
            rightArm,
            state: "entering",
            mode,
            target: this.doorWaypoint.clone(),
            eatTimer: 0,
            walkPhase: Math.random() * Math.PI * 2
        };

        this.customers.push(customer);
    }

    private refreshQueueTargets(mode: "dine_in" | "takeaway"): void {
        const queue = this.getQueue(mode);
        queue.forEach((c, idx) => {
            c.target.copy(this.getQueueSlotPosition(mode, idx));
            if (c.state === "in_queue") {
                c.state = "to_queue";
            }
        });
    }

    private findAvailableTable(): DiningTable | undefined {
        return this.tables.find((t) => !this.reservedTables.has(t) && t.isAvailable());
    }

    public tryServeTableCounter(boxMesh: THREE.Object3D, level = 1): number {
        const queue = this.getQueue("dine_in");
        if (queue.length === 0) return 0;

        const first = queue[0];
        if (first.state !== "in_queue") return 0;

        const freeTable = this.findAvailableTable();
        if (!freeTable) return 0;

        this.reservedTables.add(freeTable);

        first.table = freeTable;
        first.state = "to_table";
        first.target.set(freeTable.position.x + 1.02, 0, freeTable.position.z);

        const carried = PizzaStation.createPizzaBoxMesh();
        carried.scale.setScalar(0.8);
        carried.position.set(0, 0.95, 0.42);
        first.mesh.add(carried);
        first.carriedBox = carried;

        this.scene.remove(boxMesh);
        this.servedTotal++;
        this.refreshQueueTargets("dine_in");

        return Math.round(16 * this.getPayoutMultiplier(level));
    }

    public tryServeDeliveryCounter(boxMesh: THREE.Object3D, level = 1): number {
        const queue = this.getQueue("takeaway");
        if (queue.length === 0) return 0;

        const first = queue[0];
        if (first.state !== "in_queue") return 0;

        first.state = "exiting";
        first.target.copy(this.doorWaypoint);

        const carried = PizzaStation.createPizzaBoxMesh();
        carried.scale.setScalar(0.8);
        carried.position.set(0, 0.95, 0.42);
        first.mesh.add(carried);
        first.carriedBox = carried;

        this.scene.remove(boxMesh);
        this.servedTotal++;
        this.refreshQueueTargets("takeaway");

        return Math.round(12 * this.getPayoutMultiplier(level));
    }

    private resetLimbs(c: Customer): void {
        c.leftLeg.rotation.x = 0;
        c.rightLeg.rotation.x = 0;
        if (c.carriedBox) {
            c.leftArm.rotation.x = -0.75;
            c.rightArm.rotation.x = -0.75;
        } else {
            c.leftArm.rotation.x = 0;
            c.rightArm.rotation.x = 0;
        }
    }

    private moveTowards(c: Customer, dt: number, speed = 3.1): boolean {
        const dx = c.target.x - c.mesh.position.x;
        const dz = c.target.z - c.mesh.position.z;
        const dist = Math.hypot(dx, dz);

        if (dist <= 0.16) {
            c.mesh.position.x = c.target.x;
            c.mesh.position.z = c.target.z;
            c.mesh.position.y = 0;
            this.resetLimbs(c);
            return true;
        }

        const step = Math.min(dist, speed * dt);
        c.mesh.position.x += (dx / dist) * step;
        c.mesh.position.z += (dz / dist) * step;
        c.mesh.rotation.y = Math.atan2(dx, dz);

        c.walkPhase += dt * 12;
        const swing = Math.sin(c.walkPhase) * 0.55;
        c.leftLeg.rotation.x = swing;
        c.rightLeg.rotation.x = -swing;

        if (c.carriedBox) {
            c.leftArm.rotation.x = -0.75;
            c.rightArm.rotation.x = -0.75;
        } else {
            c.leftArm.rotation.x = -swing * 0.7;
            c.rightArm.rotation.x = swing * 0.7;
        }

        c.mesh.position.y = Math.abs(Math.sin(c.walkPhase)) * 0.06;
        return false;
    }

    public update(dt: number, level = 1): void {
        this.spawnTimer += dt;
        if (this.spawnTimer >= this.getSpawnInterval(level) && this.customers.length < this.maxCustomers) {
            this.spawnTimer = 0;
            this.spawnCustomer();
        }

        for (let i = this.customers.length - 1; i >= 0; i--) {
            const c = this.customers[i];

            if (c.state === "entering") {
                if (this.moveTowards(c, dt, 3.3)) {
                    c.state = "to_queue";
                    const queue = this.getQueue(c.mode);
                    const idx = Math.max(0, queue.indexOf(c));
                    c.target.copy(this.getQueueSlotPosition(c.mode, idx));
                }
            } else if (c.state === "to_queue") {
                if (this.moveTowards(c, dt)) {
                    c.state = "in_queue";
                    c.mesh.rotation.y = Math.PI;
                    this.resetLimbs(c);
                }
            } else if (c.state === "to_table") {
                if (this.moveTowards(c, dt) && c.table) {
                    c.state = "eating";
                    c.eatTimer = 4.2;
                    if (c.carriedBox) {
                        c.mesh.remove(c.carriedBox);
                        c.carriedBox = undefined;
                    }
                    // Coloca a caixa de pizza sobre a mesa enquanto o cliente come
                    const tableBox = PizzaStation.createPizzaBoxMesh();
                    tableBox.scale.setScalar(0.85);
                    c.table.placeEmptyBox(tableBox);

                    this.resetLimbs(c);
                    c.mesh.lookAt(c.table.position.x, 0, c.table.position.z);
                }
            } else if (c.state === "eating") {
                c.eatTimer -= dt;
                if (c.eatTimer <= 0) {
                    if (c.table) {
                        const tip = Math.round(14 * this.getPayoutMultiplier(level));
                        // Deixa a caixa vazia sujando a mesa + gorjeta no chão
                        const dirtyBox = PizzaStation.createPizzaBoxMesh();
                        dirtyBox.scale.setScalar(0.82);
                        c.table.placeEmptyBox(dirtyBox);
                        c.table.addCash(tip);

                        this.reservedTables.delete(c.table);
                        c.table = undefined;
                    }
                    c.state = "exiting";
                    c.target.copy(this.doorWaypoint);
                }
            } else if (c.state === "exiting") {
                if (this.moveTowards(c, dt, 3.4)) {
                    if (c.target.z < 12.5) {
                        c.target.set(-5.5 + Math.random() * 10.0, 0, 14.8);
                    } else {
                        this.scene.remove(c.mesh);
                        this.customers.splice(i, 1);
                    }
                }
            }
        }
    }
}