import * as THREE from "three";
import { Customer } from "../entities/Customer";
import type { CustomerMode } from "../entities/Customer";
import { DiningTable } from "../entities/DiningTable";

export class CustomerSystem {
    private readonly scene: THREE.Scene;
    private readonly tableCounterPickupPos: THREE.Vector3;
    private readonly deliveryQueueAnchor: THREE.Vector3;
    private readonly tables: DiningTable[];
    private readonly exitPos: THREE.Vector3;
    private readonly maxDeliveryQueue = 3;
    private readonly spawnInterval = 4.0;
    private readonly palette = [0xec4899, 0x8b5cf6, 0x06b6d4, 0xf97316, 0x10b981];
    private deliveryQueue: Customer[] = [];
    private seatedCustomers: Customer[] = [];
    private reservedTables: Set<number> = new Set();
    private leaving: Customer[] = [];
    private spawnTimer = 1.2;
    private servedTotal = 0;

    constructor(
        scene: THREE.Scene,
        tableCounterPos: THREE.Vector3,
        deliveryCounterPos: THREE.Vector3,
        tables: DiningTable[] = []
    ) {
        this.scene = scene;
        this.tableCounterPickupPos = new THREE.Vector3(
            tableCounterPos.x,
            0,
            tableCounterPos.z + 1.65
        );
        this.deliveryQueueAnchor = new THREE.Vector3(
            deliveryCounterPos.x,
            0,
            deliveryCounterPos.z + 1.65
        );
        this.tables = tables;
        this.exitPos = new THREE.Vector3(9.2, 0, deliveryCounterPos.z + 2.4);
    }

    public getServedTotal(): number {
        return this.servedTotal;
    }

    public setServedTotal(total: number): void {
        this.servedTotal = Math.max(0, Math.floor(total));
    }

    private getDeliverySlotPosition(index: number): THREE.Vector3 {
        return new THREE.Vector3(
            this.deliveryQueueAnchor.x + index * 1.15,
            0,
            this.deliveryQueueAnchor.z + index * 0.45
        );
    }

    private getTableCounterSlotPosition(index: number): THREE.Vector3 {
        return new THREE.Vector3(
            this.tableCounterPickupPos.x - index * 1.15,
            0,
            this.tableCounterPickupPos.z + index * 0.35
        );
    }

    private updateTableCounterQueuePositions(): void {
        const waitingAtCounter = this.seatedCustomers.filter(
            (c) => c.dineInStage === "going_to_counter" && !c.served
        );
        waitingAtCounter.forEach((c, idx) => {
            c.setTargetPosition(this.getTableCounterSlotPosition(idx));
        });
    }

    private findFreeTableIndex(): number | null {
        for (let i = 0; i < this.tables.length; i++) {
            if (!this.reservedTables.has(i) && this.tables[i].isAvailable()) {
                return i;
            }
        }
        return null;
    }

    private spawnCustomer(restaurantLevel: number): void {
        const freeTable = this.findFreeTableIndex();
        const canSeat = freeTable !== null;
        const canQueue = this.deliveryQueue.length < this.maxDeliveryQueue;

        if (!canSeat && !canQueue) return;

        const chooseDineIn = canSeat && (!canQueue || Math.random() < 0.55);
        const mode: CustomerMode = chooseDineIn ? "dine_in" : "takeaway";
        const desiredPizzas = restaurantLevel >= 2 && Math.random() < 0.4 ? 2 : 1;
        const color = this.palette[Math.floor(Math.random() * this.palette.length)];

        if (mode === "dine_in" && freeTable !== null) {
            const table = this.tables[freeTable];
            const spawnPos = new THREE.Vector3(9.5, 0, this.tableCounterPickupPos.z + 0.9);

            const customer = new Customer(
                spawnPos,
                "dine_in",
                desiredPizzas,
                color,
                freeTable,
                this.tableCounterPickupPos,
                table.position
            );
            this.reservedTables.add(freeTable);
            this.seatedCustomers.push(customer);
            this.updateTableCounterQueuePositions();
            this.scene.add(customer.mesh);
            return;
        }

        const slotIndex = this.deliveryQueue.length;
        const targetSlot = this.getDeliverySlotPosition(slotIndex);
        const spawnPos = new THREE.Vector3(9.5, 0, targetSlot.z);

        const customer = new Customer(spawnPos, "takeaway", desiredPizzas, color, null);
        customer.setTargetPosition(targetSlot);
        this.deliveryQueue.push(customer);
        this.scene.add(customer.mesh);
    }

    private sendCustomerToExit(customer: Customer): void {
        this.servedTotal++;

        if (customer.assignedTableIndex !== null) {
            const table = this.tables[customer.assignedTableIndex];
            if (table && customer.hasLeftBoxOnTable) {
                const boxOnTable = customer.extractCarriedBoxForTable();
                if (boxOnTable) {
                    table.placeEmptyBox(boxOnTable);
                }
            }
            this.reservedTables.delete(customer.assignedTableIndex);
        }

        customer.setTargetPosition(this.exitPos);
        this.leaving.push(customer);
    }

    public tryServeTableCounter(boxMesh: THREE.Object3D, restaurantLevel: number): number {
        const levelBonus = (restaurantLevel - 1) * 2;
        const waitingAtCounter = this.seatedCustomers.filter(
            (c) => c.dineInStage === "going_to_counter" && !c.served
        );
        const frontTableCustomer = waitingAtCounter[0];

        if (frontTableCustomer && frontTableCustomer.isReadyAtCounter()) {
            const completed = frontTableCustomer.receiveBox(boxMesh);
            if (completed) {
                this.updateTableCounterQueuePositions();
            }
            return 16 + levelBonus;
        }

        return 0;
    }

    public tryServeDeliveryCounter(boxMesh: THREE.Object3D, restaurantLevel: number): number {
        const levelBonus = (restaurantLevel - 1) * 2;
        const frontQueue = this.deliveryQueue[0];

        if (frontQueue && frontQueue.isReadyAtCounter()) {
            const completed = frontQueue.receiveBox(boxMesh);
            if (completed) {
                this.deliveryQueue.shift();
                this.sendCustomerToExit(frontQueue);
                this.deliveryQueue.forEach((c, idx) => {
                    c.setTargetPosition(this.getDeliverySlotPosition(idx));
                });
            }
            return 12 + levelBonus;
        }

        return 0;
    }

    update(dt: number, restaurantLevel = 1): void {
        this.spawnTimer += dt;
        if (this.spawnTimer >= this.spawnInterval) {
            this.spawnTimer = 0;
            this.spawnCustomer(restaurantLevel);
        }

        for (const c of this.deliveryQueue) {
            c.update(dt);
        }

        for (let i = this.seatedCustomers.length - 1; i >= 0; i--) {
            const c = this.seatedCustomers[i];
            c.update(dt);
            if (c.readyToLeave) {
                this.seatedCustomers.splice(i, 1);
                this.sendCustomerToExit(c);
            }
        }

        for (let i = this.leaving.length - 1; i >= 0; i--) {
            const c = this.leaving[i];
            c.update(dt);
            if (c.position.distanceTo(this.exitPos) < 0.35) {
                this.scene.remove(c.mesh);
                this.leaving.splice(i, 1);
            }
        }
    }
}