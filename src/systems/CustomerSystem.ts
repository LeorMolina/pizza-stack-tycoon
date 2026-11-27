import * as THREE from "three";
import { Customer } from "../entities/Customer";
import type { CustomerMode } from "../entities/Customer";
import { DiningTable } from "../entities/DiningTable";

export class CustomerSystem {
    private readonly scene: THREE.Scene;
    private readonly queueAnchor: THREE.Vector3;
    private readonly counterPickupPos: THREE.Vector3;
    private readonly tables: DiningTable[];
    private readonly exitPos: THREE.Vector3;
    private readonly maxQueue = 3;
    private readonly spawnInterval = 4.2;
    private readonly palette = [0xec4899, 0x8b5cf6, 0x06b6d4, 0xf97316, 0x10b981];
    private queue: Customer[] = [];
    private seatedCustomers: Customer[] = [];
    private reservedTables: Set<number> = new Set();
    private leaving: Customer[] = [];
    private spawnTimer = 1.5;
    private servedTotal = 0;

    constructor(
        scene: THREE.Scene,
        counterPos: THREE.Vector3,
        tables: DiningTable[] = []
    ) {
        this.scene = scene;
        this.queueAnchor = new THREE.Vector3(counterPos.x + 2.6, 0, counterPos.z + 0.6);
        this.counterPickupPos = new THREE.Vector3(counterPos.x + 1.5, 0, counterPos.z + 1.8);
        this.tables = tables;
        this.exitPos = new THREE.Vector3(9.2, 0, counterPos.z + 2.5);
    }

    public getQueueCount(): number {
        return this.queue.length;
    }

    public getSeatedCount(): number {
        return this.seatedCustomers.length;
    }

    public getServedTotal(): number {
        return this.servedTotal;
    }

    private getQueueSlotPosition(index: number): THREE.Vector3 {
        return new THREE.Vector3(
            this.queueAnchor.x + index * 1.4,
            0,
            this.queueAnchor.z + index * 0.6
        );
    }

    private findFreeTableIndex(): number | null {
        for (let i = 0; i < this.tables.length; i++) {
            if (!this.reservedTables.has(i) && this.tables[i].isAvailable()) {
                return i;
            }
        }
        return null;
    }

    private spawnCustomer(): void {
        const freeTable = this.findFreeTableIndex();
        const canSeat = freeTable !== null;
        const canQueue = this.queue.length < this.maxQueue;

        if (!canSeat && !canQueue) return;

        const chooseDineIn = canSeat && (!canQueue || Math.random() < 0.6);
        const mode: CustomerMode = chooseDineIn ? "dine_in" : "takeaway";
        const desiredPizzas = 1;
        const color = this.palette[Math.floor(Math.random() * this.palette.length)];

        if (mode === "dine_in" && freeTable !== null) {
            const table = this.tables[freeTable];
            const spawnPos = new THREE.Vector3(9.5, 0, this.counterPickupPos.z);

            const customer = new Customer(
                spawnPos,
                "dine_in",
                desiredPizzas,
                color,
                freeTable,
                this.counterPickupPos,
                table.position
            );
            customer.startGoingToCounter();
            this.reservedTables.add(freeTable);
            this.seatedCustomers.push(customer);
            this.scene.add(customer.mesh);
            return;
        }

        const slotIndex = this.queue.length;
        const targetSlot = this.getQueueSlotPosition(slotIndex);
        const spawnPos = new THREE.Vector3(9.5, 0, targetSlot.z);

        const customer = new Customer(spawnPos, "takeaway", desiredPizzas, color, null);
        customer.setTargetPosition(targetSlot);
        this.queue.push(customer);
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

    public onBoxReadyAtCounter(baseValue: number, boxMesh: THREE.Object3D): number {
        const activeTableCustomer = this.seatedCustomers.find((c) => !c.served);
        if (activeTableCustomer) {
            const completed = activeTableCustomer.receiveBox(boxMesh);
            let payout = baseValue + 8;
            if (completed) {
                payout += 15;
            }
            return payout;
        }

        const frontQueue = this.queue[0];
        if (frontQueue) {
            const completed = frontQueue.receiveBox(boxMesh);
            let payout = baseValue + 5;

            if (completed) {
                payout += 10;
                this.queue.shift();
                this.sendCustomerToExit(frontQueue);
                this.queue.forEach((c, idx) => {
                    c.setTargetPosition(this.getQueueSlotPosition(idx));
                });
            }
            return payout;
        }

        return baseValue;
    }

    update(dt: number): void {
        this.spawnTimer += dt;
        if (this.spawnTimer >= this.spawnInterval) {
            this.spawnTimer = 0;
            this.spawnCustomer();
        }

        for (const c of this.queue) {
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