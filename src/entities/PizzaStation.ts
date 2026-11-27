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

        const counterMat = new THREE.MeshStandardMaterial({
            color: 0xea580c,
            roughness: 0.45,
            metalness: 0.05
        });
        const topMat = new THREE.MeshStandardMaterial({
            color: 0xfffbeb,
            roughness: 0.35,
            metalness: 0.04
        });
        const clothMat = new THREE.MeshStandardMaterial({
            color: 0xdc2626,
            roughness: 0.75,
            metalness: 0.02
        });
        const trimMat = new THREE.MeshStandardMaterial({
            color: 0xfbbf24,
            roughness: 0.4,
            metalness: 0.1
        });
        const doughBallMat = new THREE.MeshStandardMaterial({
            color: 0xfde68a,
            roughness: 0.65,
            metalness: 0.02
        });
        const rollerWoodMat = new THREE.MeshStandardMaterial({
            color: 0xb45309,
            roughness: 0.55,
            metalness: 0.05
        });

        const base = new THREE.Mesh(
            new THREE.CylinderGeometry(1.18, 1.26, 1.15, 28),
            counterMat
        );
        base.position.y = 0.575;
        base.castShadow = true;
        base.receiveShadow = true;

        // Forro decorativo vermelho sobre o tampo
        const cloth = new THREE.Mesh(
            new THREE.CylinderGeometry(1.34, 1.36, 0.06, 28),
            clothMat
        );
        cloth.position.y = 1.19;
        cloth.castShadow = true;
        cloth.receiveShadow = true;

        const top = new THREE.Mesh(
            new THREE.CylinderGeometry(1.26, 1.26, 0.14, 28),
            topMat
        );
        top.position.y = 1.27;
        top.castShadow = true;
        top.receiveShadow = true;

        const ring = new THREE.Mesh(
            new THREE.TorusGeometry(1.24, 0.05, 12, 32),
            trimMat
        );
        ring.rotation.x = Math.PI / 2;
        ring.position.y = 1.15;
        ring.castShadow = true;

        // Bolinhas de massa decorativas na borda da bancada
        const doughPositions: [number, number][] = [
            [-0.78, 0.55],
            [-0.45, 0.85],
            [0.78, -0.52]
        ];
        for (const [dx, dz] of doughPositions) {
            const ball = new THREE.Mesh(new THREE.SphereGeometry(0.16, 16, 16), doughBallMat);
            ball.scale.set(1.1, 0.75, 1.1);
            ball.position.set(dx, 1.4, dz);
            ball.castShadow = true;
            this.mesh.add(ball);
        }

        // Rolo de massa na bancada
        const pinGroup = new THREE.Group();
        const pinBody = new THREE.Mesh(
            new THREE.CylinderGeometry(0.08, 0.08, 0.65, 16),
            doughBallMat
        );
        pinBody.rotation.z = Math.PI / 2;
        pinBody.castShadow = true;

        const handleLeft = new THREE.Mesh(
            new THREE.CylinderGeometry(0.035, 0.035, 0.22, 12),
            rollerWoodMat
        );
        handleLeft.rotation.z = Math.PI / 2;
        handleLeft.position.x = -0.42;

        const handleRight = new THREE.Mesh(
            new THREE.CylinderGeometry(0.035, 0.035, 0.22, 12),
            rollerWoodMat
        );
        handleRight.rotation.z = Math.PI / 2;
        handleRight.position.x = 0.42;

        pinGroup.add(pinBody, handleLeft, handleRight);
        pinGroup.position.set(0.35, 1.41, 0.72);
        pinGroup.rotation.y = -0.35;
        this.mesh.add(pinGroup);

        this.mesh.add(base, cloth, top, ring);
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

    public increaseProductionSpeed(factor = 0.85): void {
        this.productionInterval = Math.max(
            0.35,
            Number((this.productionInterval * factor).toFixed(3))
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
            pizza.position.set(0, 1.44 + index * 0.16, 0);
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
            item.mesh.position.set(0, 1.44 + idx * 0.16, 0);
        });

        return taken;
    }
}