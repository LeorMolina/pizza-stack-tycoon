import * as THREE from "three";
import { DiningTable } from "./DiningTable";
import { TrashBin } from "./TrashBin";
import { PizzaStation } from "./PizzaStation";

export class Helper {
    public readonly mesh: THREE.Group;
    private readonly leftLeg: THREE.Mesh;
    private readonly rightLeg: THREE.Mesh;
    private readonly leftArm: THREE.Mesh;
    private readonly rightArm: THREE.Mesh;
    private readonly trashStack: THREE.Group;

    private speed = 3.2;
    private capacity = 3;
    private trashCount = 0;
    private walkPhase = 0;

    constructor(x: number, z: number) {
        this.mesh = new THREE.Group();
        this.mesh.position.set(x, 0, z);

        const shirtMat = new THREE.MeshStandardMaterial({ color: 0x16a34a, roughness: 0.45 });
        const pantsMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.6 });
        const skinMat = new THREE.MeshStandardMaterial({ color: 0xfdba74, roughness: 0.4 });
        const capMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.4 });

        const legGeo = new THREE.CylinderGeometry(0.11, 0.11, 0.42, 10);
        this.leftLeg = new THREE.Mesh(legGeo, pantsMat);
        this.leftLeg.position.set(-0.14, 0.21, 0);
        this.leftLeg.castShadow = true;

        this.rightLeg = new THREE.Mesh(legGeo, pantsMat);
        this.rightLeg.position.set(0.14, 0.21, 0);
        this.rightLeg.castShadow = true;

        const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.3, 0.56, 12), shirtMat);
        torso.position.y = 0.68;
        torso.castShadow = true;

        const armGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.44, 10);
        this.leftArm = new THREE.Mesh(armGeo, shirtMat);
        this.leftArm.position.set(-0.36, 0.72, 0);
        this.leftArm.castShadow = true;

        this.rightArm = new THREE.Mesh(armGeo, shirtMat);
        this.rightArm.position.set(0.36, 0.72, 0);
        this.rightArm.castShadow = true;

        const head = new THREE.Mesh(new THREE.SphereGeometry(0.25, 12, 12), skinMat);
        head.position.y = 1.22;
        head.castShadow = true;

        const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.27, 0.14, 12), capMat);
        cap.position.y = 1.42;

        this.trashStack = new THREE.Group();
        this.trashStack.position.set(0, 1.1, 0.35);

        this.mesh.add(
            this.leftLeg,
            this.rightLeg,
            torso,
            this.leftArm,
            this.rightArm,
            head,
            cap,
            this.trashStack
        );
        this.mesh.scale.setScalar(1.28);
    }

    public setSpeed(speed: number): void {
        this.speed = speed;
    }

    public setCapacity(capacity: number): void {
        this.capacity = Math.max(1, Math.floor(capacity));
    }

    private getNavWaypoint(target: THREE.Vector3): THREE.Vector3 {
        const counterZ = -2.2;
        const passageX = 8.95;
        const currentZ = this.mesh.position.z;

        const needsCrossToHall = currentZ < counterZ - 0.4 && target.z > counterZ + 0.4;
        const needsCrossToKitchen = currentZ > counterZ + 0.4 && target.z < counterZ - 0.4;

        if ((needsCrossToHall || needsCrossToKitchen) && this.mesh.position.x < passageX - 0.45) {
            return new THREE.Vector3(passageX, 0, currentZ < counterZ ? -3.3 : -1.0);
        }
        return target;
    }

    private tableHasTrash(table: DiningTable): boolean {
        const t = table as unknown as Record<string, unknown>;
        if (typeof t.needsCleaning === "function") return (t.needsCleaning as () => boolean)();
        if (typeof t.hasEmptyBox === "function") return (t.hasEmptyBox as () => boolean)();
        return Boolean(t.hasTrash || t.dirty);
    }

    private moveTowards(target: THREE.Vector3, dt: number): boolean {
        const waypoint = this.getNavWaypoint(target);
        const dx = waypoint.x - this.mesh.position.x;
        const dz = waypoint.z - this.mesh.position.z;
        const dist = Math.hypot(dx, dz);

        if (dist <= 0.2) {
            this.leftLeg.rotation.x = 0;
            this.rightLeg.rotation.x = 0;
            this.mesh.position.y = 0;
            return waypoint === target;
        }

        const step = Math.min(dist, this.speed * dt);
        this.mesh.position.x += (dx / dist) * step;
        this.mesh.position.z += (dz / dist) * step;
        this.mesh.rotation.y = Math.atan2(dx, dz);

        this.walkPhase += dt * 12;
        const swing = Math.sin(this.walkPhase) * 0.55;
        this.leftLeg.rotation.x = swing;
        this.rightLeg.rotation.x = -swing;

        if (this.trashCount > 0) {
            this.leftArm.rotation.x = -0.7;
            this.rightArm.rotation.x = -0.7;
        } else {
            this.leftArm.rotation.x = -swing * 0.7;
            this.rightArm.rotation.x = swing * 0.7;
        }

        this.mesh.position.y = Math.abs(Math.sin(this.walkPhase)) * 0.06;
        return false;
    }

    public update(dt: number, tables: DiningTable[], trashBin: TrashBin): void {
        // Tenta coletar caixas vazias das mesas próximas
        if (this.trashCount < this.capacity) {
            for (const table of tables) {
                if (table.tryPickupEmptyBox(this.mesh.position)) {
                    const box = PizzaStation.createPizzaBoxMesh();
                    box.scale.setScalar(0.58);
                    box.position.set(0, this.trashCount * 0.18, 0);
                    this.trashStack.add(box);
                    this.trashCount++;
                    if (this.trashCount >= this.capacity) break;
                }
            }
        }

        // Se atingiu capacidade ou não há mais mesas sujas e está carregando lixo, vai para a lixeira
        const dirtyTable = tables.find((t) => this.tableHasTrash(t));

        if (this.trashCount >= this.capacity || (this.trashCount > 0 && !dirtyTable)) {
            const binTarget = new THREE.Vector3(trashBin.position.x - 0.8, 0, trashBin.position.z - 0.8);
            this.moveTowards(binTarget, dt);

            const distToBin = Math.hypot(
                this.mesh.position.x - trashBin.position.x,
                this.mesh.position.z - trashBin.position.z
            );
            if (distToBin <= 2.3) {
                this.trashCount = 0;
                this.trashStack.clear();
                this.leftArm.rotation.x = 0;
                this.rightArm.rotation.x = 0;
                trashBin.triggerFeedback();
            }
            return;
        }

        // Vai até a próxima mesa suja
        if (dirtyTable) {
            const tableTarget = new THREE.Vector3(
                dirtyTable.position.x + 1.1,
                0,
                dirtyTable.position.z
            );
            this.moveTowards(tableTarget, dt);
            return;
        }

        // Ponto de espera no salão (fora do caminho do balcão)
        const idleSpot = new THREE.Vector3(7.4, 0, 5.8);
        this.moveTowards(idleSpot, dt);
    }
}