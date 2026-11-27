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
    private readonly pickupRadius = 2.4;

    constructor(x: number, z: number) {
        this.position = new THREE.Vector3(x, 0, z);
        this.mesh = new THREE.Group();
        this.mesh.position.copy(this.position);

        const counterMat = new THREE.MeshStandardMaterial({ color: 0xd97706 });
        const topMat = new THREE.MeshStandardMaterial({ color: 0xfef3c7 });

        const base = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.2, 2.4), counterMat);
        base.position.y = 0.6;
        base.castShadow = true;
        base.receiveShadow = true;

        const top = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.2, 2.6), topMat);
        top.position.y = 1.3;
        top.castShadow = true;
        top.receiveShadow = true;

        this.mesh.add(base, top);
    }

    public static createPizzaMesh(): THREE.Mesh {
        const doughMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b });
        const sauceMat = new THREE.MeshStandardMaterial({ color: 0xdc2626 });

        const pizza = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.14, 20), doughMat);
        pizza.castShadow = true;

        const sauce = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.04, 20), sauceMat);
        sauce.position.y = 0.08;
        pizza.add(sauce);

        return pizza;
    }

    public increaseProductionSpeed(factor = 0.85): void {
        this.productionInterval = Math.max(0.35, Number((this.productionInterval * factor).toFixed(3)));
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
            pizza.position.set(0, 1.48 + index * 0.16, 0);
            this.readyPizzas.push({ mesh: pizza, age: 0 });
            this.mesh.add(pizza);
        }
    }

    collectPizzasForPlayer(playerPos: THREE.Vector3, availableSlots: number): THREE.Mesh[] {
        if (this.readyPizzas.length === 0 || availableSlots <= 0) return [];

        const dx = playerPos.x - this.position.x;
        const dz = playerPos.z - this.position.z;
        const dist = Math.hypot(dx, dz);

        if (dist > this.pickupRadius) return [];

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
            item.mesh.position.set(0, 1.48 + idx * 0.16, 0);
        });

        return taken;
    }
}