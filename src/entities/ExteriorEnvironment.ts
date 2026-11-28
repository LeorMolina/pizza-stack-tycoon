import * as THREE from "three";

interface TrafficCar {
    mesh: THREE.Group;
    direction: 1 | -1;
    speed: number;
}

export class ExteriorEnvironment {
    private readonly group: THREE.Group;
    private readonly trafficCars: TrafficCar[] = [];
    private readonly carColors = [0xef4444, 0x3b82f6, 0x10b981, 0xf59e0b, 0x8b5cf6, 0xf43f5e];

    constructor(scene: THREE.Scene) {
        this.group = new THREE.Group();

        this.buildGroundAndSidewalk();
        this.buildParkingLot();
        this.buildFrontStreetAndDriveThruConnection();
        this.buildGreeneryAndLights();
        this.spawnInitialTraffic();

        scene.add(this.group);
    }

    private buildGroundAndSidewalk(): void {
        // Gramado externo amplo
        const lawn = new THREE.Mesh(
            new THREE.PlaneGeometry(110, 110),
            new THREE.MeshStandardMaterial({ color: 0x86efac, roughness: 0.9 })
        );
        lawn.rotation.x = -Math.PI / 2;
        lawn.position.set(0, -0.26, 0);
        lawn.receiveShadow = true;

        // Calçada ao redor do restaurante (frente e lateral direita, parando em x = -10.3 para dar passagem à pista do Drive-Thru)
        const sidewalkMat = new THREE.MeshStandardMaterial({
            color: 0xe2e8f0,
            roughness: 0.75
        });

        const frontSidewalk = new THREE.Mesh(
            new THREE.BoxGeometry(23.8, 0.16, 4.2),
            sidewalkMat
        );
        frontSidewalk.position.set(1.6, -0.17, 12.1);
        frontSidewalk.receiveShadow = true;

        const rightSidewalk = new THREE.Mesh(
            new THREE.BoxGeometry(3.4, 0.16, 24.4),
            sidewalkMat
        );
        rightSidewalk.position.set(11.9, -0.17, 2.0);
        rightSidewalk.receiveShadow = true;

        // Passarela de acesso ligando o estacionamento direto à porta de entrada (x = -1.5)
        const entryWalkway = new THREE.Mesh(
            new THREE.BoxGeometry(3.2, 0.17, 3.0),
            new THREE.MeshStandardMaterial({ color: 0xfef3c7, roughness: 0.65 })
        );
        entryWalkway.position.set(-1.5, -0.165, 11.5);
        entryWalkway.receiveShadow = true;

        this.group.add(lawn, frontSidewalk, rightSidewalk, entryWalkway);
    }

    private buildParkingLot(): void {
        const lotAsphalt = new THREE.Mesh(
            new THREE.BoxGeometry(11.5, 0.14, 4.4),
            new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.85 })
        );
        lotAsphalt.position.set(7.0, -0.19, 16.0);
        lotAsphalt.receiveShadow = true;
        this.group.add(lotAsphalt);

        const lineMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5 });
        for (let i = 0; i <= 4; i++) {
            const lineX = 2.0 + i * 2.4;
            const line = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.02, 3.6), lineMat);
            line.position.set(lineX, -0.11, 16.0);
            this.group.add(line);
        }

        const stopMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.5 });
        for (let i = 0; i < 4; i++) {
            const slotCenterX = 3.2 + i * 2.4;
            const stop = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.14, 0.22), stopMat);
            stop.position.set(slotCenterX, -0.06, 14.35);
            this.group.add(stop);
        }

        const parkedSlots = [0, 1, 3];
        const parkedColors = [0x3b82f6, 0xf59e0b, 0x10b981];
        parkedSlots.forEach((slotIdx, idx) => {
            const car = this.createCarMesh(parkedColors[idx]);
            car.position.set(3.2 + slotIdx * 2.4, -0.12, 16.1);
            this.group.add(car);
        });
    }

    private buildFrontStreetAndDriveThruConnection(): void {
        const asphaltMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.88 });
        const curbMat = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, roughness: 0.65 });
        const stripeMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.45 });

        // Avenida frontal em z = 21.2
        const road = new THREE.Mesh(new THREE.BoxGeometry(90, 0.14, 5.6), asphaltMat);
        road.position.set(0, -0.19, 21.2);
        road.receiveShadow = true;

        // Meio-fio frontal (interrompido em x = -12.7 para dar entrada à pista do Drive-Thru)
        const frontCurbRight = new THREE.Mesh(new THREE.BoxGeometry(50.5, 0.2, 0.35), curbMat);
        frontCurbRight.position.set(14.8, -0.15, 18.3);

        const frontCurbLeft = new THREE.Mesh(new THREE.BoxGeometry(30.0, 0.2, 0.35), curbMat);
        frontCurbLeft.position.set(-30.0, -0.15, 18.3);

        // Alça de ligação asfaltada conectando a avenida frontal (z = 18.5) direto até a entrada do Drive-Thru (z = 10)
        const connectorAsphalt = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.14, 9.0), asphaltMat);
        connectorAsphalt.position.set(-12.7, -0.19, 14.2);
        connectorAsphalt.receiveShadow = true;

        // Meio-fio da alça de ligação
        const connCurbRight = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.22, 8.6), curbMat);
        connCurbRight.position.set(-10.48, -0.13, 14.1);

        const connCurbLeft = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.22, 8.6), curbMat);
        connCurbLeft.position.set(-14.92, -0.13, 14.1);

        // Setas/faixas amarelas guiando da avenida para dentro do Drive-Thru
        for (let z = 11.5; z <= 17.5; z += 2.6) {
            const connStripe = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.02, 1.2), stripeMat);
            connStripe.position.set(-12.7, -0.11, z);
            this.group.add(connStripe);
        }

        this.group.add(
            road,
            frontCurbRight,
            frontCurbLeft,
            connectorAsphalt,
            connCurbRight,
            connCurbLeft
        );

        // Faixa tracejada amarela no centro da avenida frontal
        for (let x = -40; x <= 40; x += 3.2) {
            const stripe = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.02, 0.18), stripeMat);
            stripe.position.set(x, -0.11, 21.2);
            this.group.add(stripe);
        }
    }

    private buildGreeneryAndLights(): void {
        // Árvores posicionadas fora da pista de acesso do Drive-Thru (x > -9.2 ou x < -16.2)
        const treePositions: [number, number][] = [
            [-8.5, 13.0],
            [-5.2, 13.2],
            [-16.8, 14.0],
            [-16.8, 6.0],
            [13.8, 12.2],
            [13.8, 4.5],
            [13.8, -3.5],
            [13.8, -10.0],
            [-6.5, -13.0],
            [3.5, -13.0]
        ];

        const trunkMat = new THREE.MeshStandardMaterial({ color: 0x92400e, roughness: 0.8 });
        const leafMat = new THREE.MeshStandardMaterial({ color: 0x22c55e, roughness: 0.65 });

        for (const [tx, tz] of treePositions) {
            const tree = new THREE.Group();
            tree.position.set(tx, -0.2, tz);

            const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.28, 1.3, 8), trunkMat);
            trunk.position.y = 0.65;
            trunk.castShadow = true;

            const crown = new THREE.Mesh(new THREE.DodecahedronGeometry(1.05, 1), leafMat);
            crown.position.y = 1.95;
            crown.castShadow = true;

            tree.add(trunk, crown);
            this.group.add(tree);
        }

        const poleMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.5 });
        const bulbMat = new THREE.MeshStandardMaterial({
            color: 0xfef08a,
            emissive: 0xfacc15,
            emissiveIntensity: 0.6
        });

        for (const px of [-4.2, 1.4, 12.6]) {
            const poleGroup = new THREE.Group();
            poleGroup.position.set(px, -0.1, 13.6);

            const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 3.2, 8), poleMat);
            pole.position.y = 1.6;

            const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.24, 10, 10), bulbMat);
            lamp.position.y = 3.25;

            poleGroup.add(pole, lamp);
            this.group.add(poleGroup);
        }
    }

    private createCarMesh(color: number): THREE.Group {
        const car = new THREE.Group();

        const bodyMat = new THREE.MeshStandardMaterial({
            color,
            roughness: 0.35,
            metalness: 0.15
        });
        const cabinMat = new THREE.MeshStandardMaterial({
            color: 0xe2e8f0,
            roughness: 0.25,
            metalness: 0.1
        });
        const wheelMat = new THREE.MeshStandardMaterial({
            color: 0x0f172a,
            roughness: 0.8
        });

        const chassis = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.65, 3.1), bodyMat);
        chassis.position.y = 0.52;
        chassis.castShadow = true;
        chassis.receiveShadow = true;

        const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.45, 0.58, 1.65), cabinMat);
        cabin.position.set(0, 1.08, -0.1);
        cabin.castShadow = true;

        const wheelGeo = new THREE.CylinderGeometry(0.32, 0.32, 0.24, 16);
        wheelGeo.rotateZ(Math.PI / 2);

        const wheelOffsets: [number, number][] = [
            [-0.88, 0.95],
            [0.88, 0.95],
            [-0.88, -0.95],
            [0.88, -0.95]
        ];
        for (const [wx, wz] of wheelOffsets) {
            const wheel = new THREE.Mesh(wheelGeo, wheelMat);
            wheel.position.set(wx, 0.32, wz);
            car.add(wheel);
        }

        car.add(chassis, cabin);
        return car;
    }

    private spawnInitialTraffic(): void {
        const configs: { x: number; z: number; dir: 1 | -1; speed: number }[] = [
            { x: -18, z: 22.4, dir: 1, speed: 7.5 },
            { x: 14, z: 22.4, dir: 1, speed: 7.5 },
            { x: 20, z: 20.0, dir: -1, speed: 8.2 },
            { x: -10, z: 20.0, dir: -1, speed: 8.2 }
        ];

        configs.forEach((cfg, idx) => {
            const color = this.carColors[idx % this.carColors.length];
            const car = this.createCarMesh(color);
            car.rotation.y = cfg.dir === 1 ? Math.PI / 2 : -Math.PI / 2;
            car.position.set(cfg.x, -0.12, cfg.z);
            this.group.add(car);

            this.trafficCars.push({
                mesh: car,
                direction: cfg.dir,
                speed: cfg.speed
            });
        });
    }

    public update(dt: number): void {
        for (const tc of this.trafficCars) {
            tc.mesh.position.x += tc.direction * tc.speed * dt;
            if (tc.direction === 1 && tc.mesh.position.x > 42) {
                tc.mesh.position.x = -42;
            } else if (tc.direction === -1 && tc.mesh.position.x < -42) {
                tc.mesh.position.x = 42;
            }
        }
    }
}