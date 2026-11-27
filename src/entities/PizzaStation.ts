import * as THREE from "three";

interface ReadyPizzaItem {
    mesh: THREE.Mesh;
    age: number;
}

export class PizzaStation {
    public readonly mesh: THREE.Group;
    public readonly position: THREE.Vector3;
    private productionInterval = 1.5;
    private readonly maxReadyPizzas = 8;
    private readonly pickupDelay = 0.28;
    private timer = 0;
    private readyPizzas: ReadyPizzaItem[] = [];
    private readonly pickupRadius = 2.85;
    private readonly sideCounterOffset = new THREE.Vector3(1.65, 0, 0.25);
    private readonly sideCounterTopY = 0.92;

    constructor(x: number, z: number) {
        this.position = new THREE.Vector3(x, 0, z);
        this.mesh = new THREE.Group();
        this.mesh.position.copy(this.position);

        const baseWhiteMat = new THREE.MeshStandardMaterial({
            color: 0xf8fafc,
            roughness: 0.5,
            metalness: 0.03
        });
        const stripeRedMat = new THREE.MeshStandardMaterial({
            color: 0xdc2626,
            roughness: 0.45,
            metalness: 0.04
        });
        const stripeBlueMat = new THREE.MeshStandardMaterial({
            color: 0x2563eb,
            roughness: 0.45,
            metalness: 0.04
        });
        const domeMat = new THREE.MeshStandardMaterial({
            color: 0x64748b,
            roughness: 0.55,
            metalness: 0.12
        });
        const mouthMat = new THREE.MeshStandardMaterial({
            color: 0x1e293b,
            roughness: 0.7,
            metalness: 0.05
        });
        const chimneyMat = new THREE.MeshStandardMaterial({
            color: 0x475569,
            roughness: 0.5,
            metalness: 0.15
        });
        const sideBaseMat = new THREE.MeshStandardMaterial({
            color: 0xb45309,
            roughness: 0.52,
            metalness: 0.04
        });
        const sideTopMat = new THREE.MeshStandardMaterial({
            color: 0xfffbeb,
            roughness: 0.35,
            metalness: 0.03
        });

        const base = new THREE.Mesh(
            new THREE.BoxGeometry(2.1, 0.9, 2.1),
            baseWhiteMat
        );
        base.position.y = 0.45;
        base.castShadow = true;
        base.receiveShadow = true;

        const redBand = new THREE.Mesh(
            new THREE.BoxGeometry(2.14, 0.16, 2.14),
            stripeRedMat
        );
        redBand.position.y = 0.68;
        redBand.castShadow = true;

        const blueBand = new THREE.Mesh(
            new THREE.BoxGeometry(2.14, 0.16, 2.14),
            stripeBlueMat
        );
        blueBand.position.y = 0.36;
        blueBand.castShadow = true;

        const dome = new THREE.Mesh(
            new THREE.SphereGeometry(0.95, 24, 18, 0, Math.PI * 2, 0, Math.PI * 0.55),
            domeMat
        );
        dome.position.set(0, 0.9, 0);
        dome.castShadow = true;
        dome.receiveShadow = true;

        const ovenMouth = new THREE.Mesh(
            new THREE.CylinderGeometry(0.36, 0.36, 0.25, 18),
            mouthMat
        );
        ovenMouth.rotation.x = Math.PI / 2;
        ovenMouth.position.set(0, 1.15, 0.82);

        const chimney = new THREE.Mesh(
            new THREE.CylinderGeometry(0.16, 0.2, 0.65, 16),
            chimneyMat
        );
        chimney.position.set(0, 1.95, -0.1);
        chimney.castShadow = true;

        const chimneyCap = new THREE.Mesh(
            new THREE.CylinderGeometry(0.24, 0.24, 0.08, 16),
            stripeRedMat
        );
        chimneyCap.position.set(0, 2.28, -0.1);
        chimneyCap.castShadow = true;

        const sideCounterGroup = new THREE.Group();
        sideCounterGroup.position.copy(this.sideCounterOffset);

        const sideBody = new THREE.Mesh(
            new THREE.BoxGeometry(1.35, 0.82, 1.55),
            sideBaseMat
        );
        sideBody.position.y = 0.41;
        sideBody.castShadow = true;
        sideBody.receiveShadow = true;

        const sideTop = new THREE.Mesh(
            new THREE.BoxGeometry(1.45, 0.1, 1.65),
            sideTopMat
        );
        sideTop.position.y = 0.87;
        sideTop.castShadow = true;
        sideTop.receiveShadow = true;

        sideCounterGroup.add(sideBody, sideTop);

        this.mesh.add(
            base,
            redBand,
            blueBand,
            dome,
            ovenMouth,
            chimney,
            chimneyCap,
            sideCounterGroup
        );
    }

    public static createPizzaMesh(): THREE.Mesh {
        const doughMat = new THREE.MeshStandardMaterial({
            color: 0xf59e0b,
            roughness: 0.55,
            metalness: 0.02
        });
        const sauceMat = new THREE.MeshStandardMaterial({
            color: 0xdc2626,
            roughness: 0.3,
            metalness: 0.05
        });
        const cheeseMat = new THREE.MeshStandardMaterial({
            color: 0xfef08a,
            roughness: 0.35,
            metalness: 0.02
        });

        const pizza = new THREE.Mesh(
            new THREE.CylinderGeometry(0.56, 0.58, 0.13, 28),
            doughMat
        );
        pizza.castShadow = true;

        const crust = new THREE.Mesh(
            new THREE.TorusGeometry(0.52, 0.055, 12, 28),
            doughMat
        );
        crust.rotation.x = Math.PI / 2;
        crust.position.y = 0.05;
        crust.castShadow = true;

        const sauce = new THREE.Mesh(
            new THREE.CylinderGeometry(0.47, 0.47, 0.035, 28),
            sauceMat
        );
        sauce.position.y = 0.075;

        const cheese = new THREE.Mesh(
            new THREE.CylinderGeometry(0.41, 0.43, 0.025, 24),
            cheeseMat
        );
        cheese.position.y = 0.095;

        pizza.add(crust, sauce, cheese);
        return pizza;
    }

    public static createPizzaBoxMesh(): THREE.Group {
        const boxGroup = new THREE.Group();

        const boxMat = new THREE.MeshStandardMaterial({
            color: 0xfef3c7,
            roughness: 0.65,
            metalness: 0.02
        });
        const stripeMat = new THREE.MeshStandardMaterial({
            color: 0xdc2626,
            roughness: 0.45,
            metalness: 0.04
        });

        const bottom = new THREE.Mesh(
            new THREE.BoxGeometry(0.95, 0.12, 0.95),
            boxMat
        );
        bottom.position.y = 0.06;
        bottom.castShadow = true;

        const lid = new THREE.Mesh(
            new THREE.BoxGeometry(1.0, 0.08, 1.0),
            boxMat
        );
        lid.position.y = 0.16;
        lid.castShadow = true;

        const band = new THREE.Mesh(
            new THREE.BoxGeometry(1.02, 0.085, 0.22),
            stripeMat
        );
        band.position.y = 0.16;

        boxGroup.add(bottom, lid, band);
        return boxGroup;
    }

    public increaseProductionSpeed(factor = 0.85): void {
        this.productionInterval = Math.max(
            0.35,
            Number((this.productionInterval * factor).toFixed(3))
        );
    }

    private getStackPizzaPosition(index: number): THREE.Vector3 {
        return new THREE.Vector3(
            this.sideCounterOffset.x,
            this.sideCounterTopY + 0.08 + index * 0.16,
            this.sideCounterOffset.z
        );
    }

    update(dt: number): void {
        for (const item of this.readyPizzas) {
            item.age += dt;
        }

        if (this.readyPizzas.length >= this.maxReadyPizzas) return;

        this.timer += dt;
        if (this.timer >= this.productionInterval) {
            this.timer = 0;
            const pizza = PizzaStation.createPizzaMesh();
            const index = this.readyPizzas.length;
            pizza.position.copy(this.getStackPizzaPosition(index));
            this.readyPizzas.push({ mesh: pizza, age: 0 });
            this.mesh.add(pizza);
        }
    }

    collectPizzasForPlayer(playerPos: THREE.Vector3, availableSlots: number): THREE.Mesh[] {
        if (this.readyPizzas.length === 0 || availableSlots <= 0) return [];

        const stackWorldX = this.position.x + this.sideCounterOffset.x;
        const stackWorldZ = this.position.z + this.sideCounterOffset.z;
        const distToSide = Math.hypot(playerPos.x - stackWorldX, playerPos.z - stackWorldZ);
        const distToOven = Math.hypot(playerPos.x - this.position.x, playerPos.z - this.position.z);

        if (distToSide > this.pickupRadius && distToOven > this.pickupRadius) return [];

        const taken: THREE.Mesh[] = [];
        const remaining: ReadyPizzaItem[] = [];

        for (const item of this.readyPizzas) {
            if (item.age >= this.pickupDelay && taken.length < availableSlots) {
                this.mesh.remove(item.mesh);
                taken.push(item.mesh);
            } else {
                remaining.push(item);
            }
        }

        this.readyPizzas = remaining;
        this.readyPizzas.forEach((item, idx) => {
            item.mesh.position.copy(this.getStackPizzaPosition(idx));
        });

        return taken;
    }
}