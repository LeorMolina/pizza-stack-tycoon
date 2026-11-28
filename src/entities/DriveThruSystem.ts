import * as THREE from "three";
import { PizzaStation } from "./PizzaStation";

interface CarOrder {
    mesh: THREE.Group;
    bubbleSprite: THREE.Sprite;
    bubbleTexture: THREE.CanvasTexture;
    desiredBoxes: number;
    receivedBoxes: number;
    targetZ: number;
    state: "arriving" | "waiting" | "leaving";
    speed: number;
}

export class DriveThruSystem {
    public readonly unlockCost = 350;
    public readonly padPosition = new THREE.Vector3(-7.4, 0, -4.4);
    public readonly counterPosition = new THREE.Vector3(-9.15, 0, -4.4);
    public readonly dropZoneCenter = new THREE.Vector3(-7.65, 0, -4.4);

    private readonly scene: THREE.Scene;
    private readonly padGroup: THREE.Group;
    private readonly padRing: THREE.Mesh;
    private readonly counterGroup: THREE.Group;
    private readonly builtGroup: THREE.Group;
    private readonly counterBoxStack: THREE.Group;
    private readonly carsGroup: THREE.Group;

    private unlocked = false;
    private unlockProgress = 0;
    private readonly unlockDuration = 0.85;
    private dropTimer = 0;
    private spawnTimer = 1.5;
    private cars: CarOrder[] = [];
    private bounceTime = 0;

    private readonly carColors = [0xef4444, 0x3b82f6, 0x10b981, 0xf59e0b, 0x8b5cf6, 0xec4899];

    constructor(scene: THREE.Scene) {
        this.scene = scene;

        // Balcão em L embaixo das duas janelas (sempre visível desde o início)
        this.counterGroup = new THREE.Group();
        this.buildWindowCounter();
        this.scene.add(this.counterGroup);

        // Zona de compra no chão (ao lado do balcão da janela)
        this.padGroup = new THREE.Group();
        this.padGroup.position.copy(this.padPosition);
        this.padRing = this.buildPurchasePad();
        this.scene.add(this.padGroup);

        // Pista externa, anel de entrega e carros (aparecem ao desbloquear)
        this.builtGroup = new THREE.Group();
        this.builtGroup.visible = false;
        this.buildRoadAndDropZone();
        this.scene.add(this.builtGroup);

        this.counterBoxStack = new THREE.Group();
        this.counterBoxStack.position.set(
            this.counterPosition.x,
            1.26,
            this.counterPosition.z
        );
        this.builtGroup.add(this.counterBoxStack);

        this.carsGroup = new THREE.Group();
        this.builtGroup.add(this.carsGroup);
    }

    public isUnlocked(): boolean {
        return this.unlocked;
    }

    public setUnlocked(value: boolean): void {
        this.unlocked = value;
        this.padGroup.visible = !value;
        this.builtGroup.visible = value;
    }

    public getBoxCount(): number {
        return this.counterBoxStack.children.length;
    }

    public addBoxToCounter(): void {
        const box = PizzaStation.createPizzaBoxMesh();
        this.counterBoxStack.add(box);
        this.restackBoxes();
        this.bounceTime = 0.2;
    }

    private restackBoxes(): void {
        this.counterBoxStack.children.forEach((box, idx) => {
            box.position.set(0, idx * 0.22, 0);
        });
    }

    private buildWindowCounter(): void {
        // Braço esquerdo do balcão em L (vermelho coral embaixo das duas janelas)
        const armLength = 5.5;
        const armCenterZ = -4.25;

        const plinth = new THREE.Mesh(
            new THREE.BoxGeometry(1.32, 0.16, armLength - 0.06),
            new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.5 })
        );
        plinth.position.set(this.counterPosition.x, 0.08, armCenterZ);

        const counterBase = new THREE.Mesh(
            new THREE.BoxGeometry(1.4, 0.92, armLength),
            new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 })
        );
        counterBase.position.set(this.counterPosition.x, 0.62, armCenterZ);
        counterBase.castShadow = true;
        counterBase.receiveShadow = true;

        const counterStripe = new THREE.Mesh(
            new THREE.BoxGeometry(1.44, 0.24, armLength + 0.02),
            new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.35 })
        );
        counterStripe.position.set(this.counterPosition.x, 0.88, armCenterZ);

        const counterTop = new THREE.Mesh(
            new THREE.BoxGeometry(1.48, 0.08, armLength + 0.04),
            new THREE.MeshStandardMaterial({ color: 0xfef9c3, roughness: 0.35 })
        );
        counterTop.position.set(this.counterPosition.x, 1.12, armCenterZ);
        counterTop.castShadow = true;

        this.counterGroup.add(plinth, counterBase, counterStripe, counterTop);
    }

    private buildPurchasePad(): THREE.Mesh {
        const padBorder = new THREE.Mesh(
            new THREE.RingGeometry(0.95, 1.15, 4),
            new THREE.MeshBasicMaterial({
                color: 0xef4444,
                side: THREE.DoubleSide
            })
        );
        padBorder.rotation.x = -Math.PI / 2;
        padBorder.rotation.z = Math.PI / 4;
        padBorder.position.y = 0.025;

        const padFill = new THREE.Mesh(
            new THREE.PlaneGeometry(1.34, 1.34),
            new THREE.MeshBasicMaterial({
                color: 0xf87171,
                transparent: true,
                opacity: 0.24,
                side: THREE.DoubleSide
            })
        );
        padFill.rotation.x = -Math.PI / 2;
        padFill.position.y = 0.02;

        const signSprite = this.createSignSprite(
            "DRIVE-THRU",
            `R$ ${this.unlockCost}`,
            "#dc2626"
        );
        signSprite.position.set(0, 1.35, 0);
        signSprite.scale.set(2.3, 1.15, 1);

        this.padGroup.add(padBorder, padFill, signSprite);
        return padBorder;
    }

    private createSignSprite(title: string, subtitle: string, bgColor: string): THREE.Sprite {
        const canvas = document.createElement("canvas");
        canvas.width = 320;
        canvas.height = 160;
        const ctx = canvas.getContext("2d")!;

        ctx.fillStyle = bgColor;
        ctx.beginPath();
        ctx.roundRect(12, 16, 296, 128, 24);
        ctx.fill();

        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 6;
        ctx.stroke();

        ctx.fillStyle = "#ffffff";
        ctx.font = "900 32px system-ui, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(title, 160, 68);

        ctx.fillStyle = "#fef08a";
        ctx.font = "800 34px system-ui, sans-serif";
        ctx.fillText(subtitle, 160, 116);

        const texture = new THREE.CanvasTexture(canvas);
        const material = new THREE.SpriteMaterial({ map: texture, transparent: true });
        return new THREE.Sprite(material);
    }

    private buildRoadAndDropZone(): void {
        const road = new THREE.Mesh(
            new THREE.BoxGeometry(4.4, 0.22, 24),
            new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.85 })
        );
        road.position.set(-12.7, -0.14, 0);
        road.receiveShadow = true;

        const curb = new THREE.Mesh(
            new THREE.BoxGeometry(0.45, 0.28, 24),
            new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.6 })
        );
        curb.position.set(-10.48, -0.1, 0);
        curb.receiveShadow = true;

        const stripeMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.5 });
        for (let z = -10; z <= 10; z += 2.6) {
            const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.02, 1.2), stripeMat);
            stripe.position.set(-12.7, -0.02, z);
            this.builtGroup.add(stripe);
        }

        const awning = new THREE.Mesh(
            new THREE.BoxGeometry(1.5, 0.25, 4.6),
            new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.45 })
        );
        awning.position.set(-10.9, 2.25, -4.1);
        awning.castShadow = true;

        const dropRing = new THREE.Mesh(
            new THREE.RingGeometry(0.85, 1.08, 32),
            new THREE.MeshBasicMaterial({
                color: 0xef4444,
                side: THREE.DoubleSide
            })
        );
        dropRing.rotation.x = -Math.PI / 2;
        dropRing.position.set(this.dropZoneCenter.x, 0.025, this.dropZoneCenter.z);

        this.builtGroup.add(road, curb, awning, dropRing);
    }

    private createOrderBubble(remaining: number): {
        sprite: THREE.Sprite;
        texture: THREE.CanvasTexture;
    } {
        const canvas = document.createElement("canvas");
        canvas.width = 180;
        canvas.height = 100;
        const texture = new THREE.CanvasTexture(canvas);
        this.drawBubbleCanvas(texture, remaining);

        const material = new THREE.SpriteMaterial({ map: texture, transparent: true });
        const sprite = new THREE.Sprite(material);
        sprite.scale.set(1.55, 0.86, 1);
        sprite.position.set(0, 2.35, 0);
        return { sprite, texture };
    }

    private drawBubbleCanvas(texture: THREE.CanvasTexture, remaining: number): void {
        const canvas = texture.image as HTMLCanvasElement;
        const ctx = canvas.getContext("2d")!;
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.roundRect(10, 10, 160, 74, 20);
        ctx.fill();

        ctx.strokeStyle = "#ef4444";
        ctx.lineWidth = 5;
        ctx.stroke();

        ctx.fillStyle = "#0f172a";
        ctx.font = "900 34px system-ui, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(`🍕 x${remaining}`, 90, 58);

        texture.needsUpdate = true;
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

    private spawnCar(restaurantLevel: number): void {
        if (this.cars.length >= 2) return;

        const slotIndex = this.cars.length;
        const targetZ = -3.8 + slotIndex * 4.4;
        const desiredBoxes = Math.min(4, 2 + Math.floor(Math.random() * Math.min(3, restaurantLevel)));
        const color = this.carColors[Math.floor(Math.random() * this.carColors.length)];

        const carMesh = this.createCarMesh(color);
        carMesh.position.set(-12.7, -0.12, 20.5);

        const { sprite, texture } = this.createOrderBubble(desiredBoxes);
        carMesh.add(sprite);
        this.carsGroup.add(carMesh);

        this.cars.push({
            mesh: carMesh,
            bubbleSprite: sprite,
            bubbleTexture: texture,
            desiredBoxes,
            receivedBoxes: 0,
            targetZ,
            state: "arriving",
            speed: 5.5
        });
    }

    public updateUnlockPad(
        dt: number,
        playerPos: THREE.Vector3,
        currentMoney: number
    ): { unlockedNow: boolean; costPaid: number } {
        if (this.unlocked) {
            return { unlockedNow: false, costPaid: 0 };
        }

        const pulse = 1 + Math.sin(performance.now() * 0.005) * 0.05;
        this.padRing.scale.set(pulse, pulse, 1);

        const dist = Math.hypot(
            playerPos.x - this.padPosition.x,
            playerPos.z - this.padPosition.z
        );

        if (dist <= 1.3 && currentMoney >= this.unlockCost) {
            this.unlockProgress += dt;
            if (this.unlockProgress >= this.unlockDuration) {
                this.setUnlocked(true);
                return { unlockedNow: true, costPaid: this.unlockCost };
            }
        } else {
            this.unlockProgress = Math.max(0, this.unlockProgress - dt * 1.5);
        }

        return { unlockedNow: false, costPaid: 0 };
    }

    public updatePlayerDrop(
        dt: number,
        playerPos: THREE.Vector3,
        playerStackCount: number,
        inFlightCount: number
    ): boolean {
        if (!this.unlocked) return false;

        const totalBoxes = this.counterBoxStack.children.length + inFlightCount;
        if (playerStackCount <= 0 || totalBoxes >= 8) {
            this.dropTimer = 0;
            return false;
        }

        const dist = Math.hypot(
            playerPos.x - this.dropZoneCenter.x,
            playerPos.z - this.dropZoneCenter.z
        );

        if (dist <= 1.5) {
            this.dropTimer += dt;
            if (this.dropTimer >= 0.14) {
                this.dropTimer = 0;
                return true;
            }
        } else {
            this.dropTimer = 0;
        }

        return false;
    }

    public update(dt: number, restaurantLevel: number): number {
        if (!this.unlocked) return 0;

        if (this.bounceTime > 0) {
            this.bounceTime = Math.max(0, this.bounceTime - dt);
            const t = 1 - this.bounceTime / 0.2;
            const s = 1 + Math.sin(t * Math.PI) * 0.08;
            this.counterBoxStack.scale.set(s, 1 / s, s);
        } else {
            this.counterBoxStack.scale.set(1, 1, 1);
        }

        this.spawnTimer += dt;
        if (this.spawnTimer >= 4.5) {
            this.spawnTimer = 0;
            this.spawnCar(restaurantLevel);
        }

        let earnedMoney = 0;

        for (let i = this.cars.length - 1; i >= 0; i--) {
            const car = this.cars[i];

            if (car.state === "arriving") {
                car.mesh.position.z -= car.speed * dt;
                if (car.mesh.position.z <= car.targetZ) {
                    car.mesh.position.z = car.targetZ;
                    car.state = "waiting";
                }
            } else if (car.state === "waiting") {
                if (i === 0 && this.counterBoxStack.children.length > 0) {
                    const topBox =
                        this.counterBoxStack.children[this.counterBoxStack.children.length - 1];
                    this.counterBoxStack.remove(topBox);
                    this.restackBoxes();

                    car.receivedBoxes++;
                    const remaining = car.desiredBoxes - car.receivedBoxes;
                    const payoutPerBox = 24 + (restaurantLevel - 1) * 3;
                    earnedMoney += payoutPerBox;

                    if (remaining > 0) {
                        this.drawBubbleCanvas(car.bubbleTexture, remaining);
                    } else {
                        car.bubbleSprite.visible = false;
                        car.state = "leaving";
                        if (this.cars[1]) {
                            this.cars[1].targetZ = -3.8;
                            if (this.cars[1].state === "waiting") {
                                this.cars[1].state = "arriving";
                            }
                        }
                    }
                }
            } else if (car.state === "leaving") {
                car.mesh.position.z -= (car.speed + 2.5) * dt;
                if (car.mesh.position.z <= -14.5) {
                    this.carsGroup.remove(car.mesh);
                    car.bubbleTexture.dispose();
                    this.cars.splice(i, 1);
                }
            }
        }

        return earnedMoney;
    }
}