import * as THREE from "three";
import { Player } from "../entities/Player";
import { PizzaStation } from "../entities/PizzaStation";
import { DeliveryCounter } from "../entities/DeliveryCounter";
import { DiningTable } from "../entities/DiningTable";
import { TrashBin } from "../entities/TrashBin";
import { Helper } from "../entities/Helper";
import { DeliveryHelper } from "../entities/DeliveryHelper";
import { DriveThruSystem } from "../entities/DriveThruSystem";
import type { CounterTarget } from "../entities/DeliveryHelper";
import { InputController } from "../systems/InputController";
import { UIManager } from "../systems/UIManager";
import { UpgradeSystem } from "../systems/UpgradeSystem";
import { CustomerSystem } from "../systems/CustomerSystem";
import type { UpgradeId, UpgradeLevels } from "../systems/UpgradeSystem";

type DropTarget = CounterTarget | "drivethru";

interface FlyingPizza {
    mesh: THREE.Object3D;
    start: THREE.Vector3;
    target: THREE.Vector3;
    elapsed: number;
    duration: number;
    targetCounter: DropTarget;
}

interface PickingPizza {
    mesh: THREE.Mesh;
    start: THREE.Vector3;
    elapsed: number;
    duration: number;
}

interface SaveData {
    money: number;
    servedTotal: number;
    driveThruUnlocked?: boolean;
    levels: Partial<UpgradeLevels>;
}

const SAVE_STORAGE_KEY = "pizza_stack_tycoon_save_v1";

export class GameEngine {
    private scene: THREE.Scene;
    private camera: THREE.PerspectiveCamera;
    private renderer: THREE.WebGLRenderer;
    private player: Player;
    private helper: Helper;
    private deliveryHelper: DeliveryHelper;
    private driveThru: DriveThruSystem;
    private station: PizzaStation;
    private tableCounter: DeliveryCounter;
    private deliveryCounter: DeliveryCounter;
    private trashBin: TrashBin;
    private tables: DiningTable[] = [];
    private input: InputController;
    private ui: UIManager;
    private upgrades: UpgradeSystem;
    private customers: CustomerSystem;
    private flyingPizzas: FlyingPizza[] = [];
    private pickingPizzas: PickingPizza[] = [];
    private readonly tableCounterBoxStack: THREE.Group;
    private readonly deliveryCounterBoxStack: THREE.Group;
    private readonly maxBoxesPerCounter = 6;
    private readonly trashStack: THREE.Group;
    private trashCount = 0;
    private money = 0;
    private saveTimer = 0;
    private isResetting = false;
    private lastTime = performance.now();

    constructor(container: HTMLElement) {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0xe0f2fe);

        const aspect = container.clientWidth / container.clientHeight;
        this.camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 100);
        this.camera.position.set(12, 14, 12);
        this.camera.lookAt(0, 0, 0);

        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(container.clientWidth, container.clientHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        container.appendChild(this.renderer.domElement);
        this.renderer.domElement.style.touchAction = "none";

        const hemiLight = new THREE.HemisphereLight(0xffffff, 0xe2e8f0, 0.9);
        const dirLight = new THREE.DirectionalLight(0xfffbeb, 1.05);
        dirLight.position.set(10, 18, 10);
        dirLight.castShadow = true;
        dirLight.shadow.mapSize.set(1024, 1024);
        this.scene.add(hemiLight, dirLight);

        this.buildRestaurantFloor();

        this.station = new PizzaStation(-5.4, -6.8);
        this.scene.add(this.station.mesh);

        this.tableCounter = new DeliveryCounter(-1.2, -2.2, 0x0284c7, 16);
        this.scene.add(this.tableCounter.mesh);

        this.deliveryCounter = new DeliveryCounter(3.6, -2.2, 0xf59e0b, 12);
        this.scene.add(this.deliveryCounter.mesh);

        this.trashBin = new TrashBin(8.2, -1.8);
        this.scene.add(this.trashBin.mesh);

        this.driveThru = new DriveThruSystem(this.scene);

        this.tableCounterBoxStack = new THREE.Group();
        this.tableCounterBoxStack.position.set(
            this.tableCounter.position.x,
            1.26,
            this.tableCounter.position.z
        );
        this.scene.add(this.tableCounterBoxStack);

        this.deliveryCounterBoxStack = new THREE.Group();
        this.deliveryCounterBoxStack.position.set(
            this.deliveryCounter.position.x,
            1.26,
            this.deliveryCounter.position.z
        );
        this.scene.add(this.deliveryCounterBoxStack);

        this.trashStack = new THREE.Group();
        this.trashStack.position.set(0, 1.25, -0.58);

        const tableCoords: [number, number][] = [
            [-4.8, 4.6],
            [0, 4.6],
            [4.8, 4.6]
        ];
        for (const [tx, tz] of tableCoords) {
            const table = new DiningTable(tx, tz);
            this.tables.push(table);
            this.scene.add(table.mesh);
        }

        this.player = new Player();
        this.player.mesh.position.set(-2.5, 0, -4.8);
        this.player.mesh.add(this.trashStack);
        this.scene.add(this.player.mesh);

        this.helper = new Helper(7.4, -4.2);
        this.scene.add(this.helper.mesh);

        this.deliveryHelper = new DeliveryHelper(-4.0, -4.8);
        this.scene.add(this.deliveryHelper.mesh);

        this.upgrades = new UpgradeSystem();
        this.customers = new CustomerSystem(
            this.scene,
            this.tableCounter.position,
            this.deliveryCounter.position,
            this.tables
        );

        this.loadGame();

        this.input = new InputController(this.renderer.domElement);
        this.ui = new UIManager(
            container,
            (id) => this.handleUpgrade(id),
            () => this.saveGame(),
            () => this.resetGame()
        );

        window.addEventListener("resize", () => this.onResize(container));
        window.addEventListener("beforeunload", () => this.saveGame());
        this.loop(performance.now());
    }

    private saveGame(): void {
        if (this.isResetting) return;
        try {
            const payload: SaveData = {
                money: this.money,
                servedTotal: this.customers.getServedTotal(),
                driveThruUnlocked: this.driveThru.isUnlocked(),
                levels: this.upgrades.getLevels()
            };
            window.localStorage.setItem(SAVE_STORAGE_KEY, JSON.stringify(payload));
        } catch {
            // Ignora falha caso o storage esteja bloqueado
        }
    }

    private loadGame(): void {
        try {
            const raw = window.localStorage.getItem(SAVE_STORAGE_KEY);
            if (!raw) return;

            const data = JSON.parse(raw) as Partial<SaveData>;
            if (typeof data.money === "number" && Number.isFinite(data.money)) {
                this.money = Math.max(0, Math.floor(data.money));
            }
            if (typeof data.servedTotal === "number" && Number.isFinite(data.servedTotal)) {
                this.customers.setServedTotal(data.servedTotal);
            }
            if (data.driveThruUnlocked === true) {
                this.driveThru.setUnlocked(true);
            }
            if (data.levels && typeof data.levels === "object") {
                this.upgrades.restoreLevels(
                    data.levels,
                    this.player,
                    this.station,
                    this.helper,
                    this.deliveryHelper
                );
            }
        } catch {
            // Ignora save corrompido
        }
    }

    private resetGame(): void {
        this.isResetting = true;
        try {
            window.localStorage.removeItem(SAVE_STORAGE_KEY);
        } catch {
            // Ignora erro de acesso
        }
        window.location.reload();
    }

    private getLevelInfo(): { level: number; progressText: string } {
        const served = this.customers.getServedTotal();
        const customersPerLevel = 5;
        const level = Math.floor(served / customersPerLevel) + 1;
        const current = served % customersPerLevel;
        return {
            level,
            progressText: `${current}/${customersPerLevel}`
        };
    }

    private projectWorldToScreen(worldPos: THREE.Vector3): { x: number; y: number } {
        const projected = worldPos.clone().project(this.camera);
        const width = this.renderer.domElement.clientWidth;
        const height = this.renderer.domElement.clientHeight;
        return {
            x: (projected.x * 0.5 + 0.5) * width,
            y: (-projected.y * 0.5 + 0.5) * height
        };
    }

    private buildRestaurantFloor(): void {
        const floorGroup = new THREE.Group();
        const size = 20;
        const tilesPerSide = 10;
        const tileSize = size / tilesPerSide;
        const dividerZ = -1.2;

        const kitchenLightMat = new THREE.MeshStandardMaterial({
            color: 0xf8f5f0,
            roughness: 0.55,
            metalness: 0.02
        });
        const kitchenWarmMat = new THREE.MeshStandardMaterial({
            color: 0xede6da,
            roughness: 0.55,
            metalness: 0.02
        });

        const hallWoodMat = new THREE.MeshStandardMaterial({
            color: 0xf3d4ad,
            roughness: 0.65,
            metalness: 0.02
        });
        const hallWoodAltMat = new THREE.MeshStandardMaterial({
            color: 0xecc99e,
            roughness: 0.65,
            metalness: 0.02
        });

        for (let gx = 0; gx < tilesPerSide; gx++) {
            for (let gz = 0; gz < tilesPerSide; gz++) {
                const posX = -size / 2 + tileSize / 2 + gx * tileSize;
                const posZ = -size / 2 + tileSize / 2 + gz * tileSize;
                const isKitchen = posZ < dividerZ;
                const isEven = (gx + gz) % 2 === 0;

                const mat = isKitchen
                    ? isEven
                        ? kitchenLightMat
                        : kitchenWarmMat
                    : isEven
                        ? hallWoodMat
                        : hallWoodAltMat;

                const tile = new THREE.Mesh(
                    new THREE.BoxGeometry(tileSize - 0.03, 0.25, tileSize - 0.03),
                    mat
                );
                tile.position.set(posX, -0.125, posZ);
                tile.receiveShadow = true;
                floorGroup.add(tile);
            }
        }

        const dividerStrip = new THREE.Mesh(
            new THREE.BoxGeometry(size, 0.02, 0.16),
            new THREE.MeshStandardMaterial({ color: 0xcbd5e1, roughness: 0.4 })
        );
        dividerStrip.position.set(0, 0.005, dividerZ);
        dividerStrip.receiveShadow = true;
        floorGroup.add(dividerStrip);

        const wallMat = new THREE.MeshStandardMaterial({
            color: 0xf1f5f9,
            roughness: 0.6,
            metalness: 0.03
        });
        const trimMat = new THREE.MeshStandardMaterial({
            color: 0x0284c7,
            roughness: 0.45
        });
        const lowWallMat = new THREE.MeshStandardMaterial({
            color: 0xd97706,
            roughness: 0.55
        });

        const highWallHeight = 2.7;
        const wallThickness = 0.45;

        const backWall = new THREE.Mesh(
            new THREE.BoxGeometry(size + wallThickness * 2, highWallHeight, wallThickness),
            wallMat
        );
        backWall.position.set(0, highWallHeight / 2 - 0.25, -size / 2 - wallThickness / 2);
        backWall.castShadow = true;
        backWall.receiveShadow = true;

        const backTrim = new THREE.Mesh(
            new THREE.BoxGeometry(size + wallThickness * 2, 0.22, wallThickness + 0.06),
            trimMat
        );
        backTrim.position.set(0, highWallHeight - 0.25, -size / 2 - wallThickness / 2);

        const leftWall = new THREE.Mesh(
            new THREE.BoxGeometry(wallThickness, highWallHeight, size + wallThickness * 2),
            wallMat
        );
        leftWall.position.set(-size / 2 - wallThickness / 2, highWallHeight / 2 - 0.25, 0);
        leftWall.castShadow = true;
        leftWall.receiveShadow = true;

        const leftTrim = new THREE.Mesh(
            new THREE.BoxGeometry(wallThickness + 0.06, 0.22, size + wallThickness * 2),
            trimMat
        );
        leftTrim.position.set(-size / 2 - wallThickness / 2, highWallHeight - 0.25, 0);

        const glassMat = new THREE.MeshStandardMaterial({
            color: 0x7dd3fc,
            roughness: 0.2,
            metalness: 0.1
        });
        for (const winZ of [-5.8, -2.6]) {
            const frame = new THREE.Mesh(
                new THREE.BoxGeometry(wallThickness + 0.12, 1.15, 2.3),
                trimMat
            );
            frame.position.set(-size / 2 - wallThickness / 2, 1.45, winZ);

            const glass = new THREE.Mesh(
                new THREE.BoxGeometry(wallThickness + 0.16, 0.9, 2.0),
                glassMat
            );
            glass.position.set(-size / 2 - wallThickness / 2, 1.45, winZ);
            floorGroup.add(frame, glass);
        }

        const signBoard = new THREE.Mesh(
            new THREE.BoxGeometry(0.18, 1.25, 3.8),
            new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.35 })
        );
        signBoard.position.set(-size / 2 - 0.12, 3.15, -4.2);
        signBoard.castShadow = true;
        floorGroup.add(signBoard);

        const hrDoorFrame = new THREE.Mesh(
            new THREE.BoxGeometry(1.5, 2.1, 0.18),
            new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.5 })
        );
        hrDoorFrame.position.set(6.2, 0.85, -size / 2 + 0.02);

        const hrDoor = new THREE.Mesh(
            new THREE.BoxGeometry(1.26, 1.98, 0.22),
            new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.45 })
        );
        hrDoor.position.set(6.2, 0.8, -size / 2 + 0.03);

        const hrKnob = new THREE.Mesh(
            new THREE.SphereGeometry(0.06, 10, 10),
            new THREE.MeshStandardMaterial({ color: 0xfacc15, metalness: 0.6, roughness: 0.25 })
        );
        hrKnob.position.set(6.65, 0.85, -size / 2 + 0.16);

        const hrMat = new THREE.Mesh(
            new THREE.BoxGeometry(1.6, 0.03, 0.9),
            new THREE.MeshStandardMaterial({ color: 0xb91c1c, roughness: 0.7 })
        );
        hrMat.position.set(6.2, 0.01, -size / 2 + 0.65);

        floorGroup.add(hrDoorFrame, hrDoor, hrKnob, hrMat);

        const lowHeight = 0.48;
        const rightWall = new THREE.Mesh(
            new THREE.BoxGeometry(wallThickness, lowHeight, size + wallThickness * 2),
            lowWallMat
        );
        rightWall.position.set(size / 2 + wallThickness / 2, lowHeight / 2 - 0.25, 0);
        rightWall.receiveShadow = true;

        const frontWall = new THREE.Mesh(
            new THREE.BoxGeometry(size + wallThickness * 2, lowHeight, wallThickness),
            lowWallMat
        );
        frontWall.position.set(0, lowHeight / 2 - 0.25, size / 2 + wallThickness / 2);
        frontWall.receiveShadow = true;

        floorGroup.add(backWall, backTrim, leftWall, leftTrim, rightWall, frontWall);
        this.scene.add(floorGroup);
    }

    private handleUpgrade(id: UpgradeId): void {
        const result = this.upgrades.tryBuy(
            id,
            this.money,
            this.player,
            this.station,
            this.helper,
            this.deliveryHelper
        );
        if (result.purchased) {
            this.money = result.newMoney;
            this.saveGame();
        }
    }

    private onResize(container: HTMLElement): void {
        this.camera.aspect = container.clientWidth / container.clientHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(container.clientWidth, container.clientHeight);
    }

    private resolveBoxCollision(
        pos: THREE.Vector3,
        radius: number,
        boxCenter: THREE.Vector3,
        halfX: number,
        halfZ: number
    ): void {
        const closestX = Math.max(boxCenter.x - halfX, Math.min(pos.x, boxCenter.x + halfX));
        const closestZ = Math.max(boxCenter.z - halfZ, Math.min(pos.z, boxCenter.z + halfZ));

        const dx = pos.x - closestX;
        const dz = pos.z - closestZ;
        const distSq = dx * dx + dz * dz;

        if (distSq < radius * radius) {
            const dist = Math.sqrt(distSq);
            if (dist > 0.0001) {
                const overlap = radius - dist;
                pos.x += (dx / dist) * overlap;
                pos.z += (dz / dist) * overlap;
            } else {
                const penX = halfX + radius - Math.abs(pos.x - boxCenter.x);
                const penZ = halfZ + radius - Math.abs(pos.z - boxCenter.z);
                if (penX < penZ) {
                    pos.x += pos.x >= boxCenter.x ? penX : -penX;
                } else {
                    pos.z += pos.z >= boxCenter.z ? penZ : -penZ;
                }
            }
        }
    }

    private resolveCircleCollision(
        pos: THREE.Vector3,
        playerRadius: number,
        center: THREE.Vector3,
        obstacleRadius: number
    ): void {
        const dx = pos.x - center.x;
        const dz = pos.z - center.z;
        const minDist = playerRadius + obstacleRadius;
        const distSq = dx * dx + dz * dz;

        if (distSq < minDist * minDist) {
            const dist = Math.sqrt(distSq) || 0.0001;
            const overlap = minDist - dist;
            pos.x += (dx / dist) * overlap;
            pos.z += (dz / dist) * overlap;
        }
    }

    private applyWorldCollisions(): void {
        const playerRadius = 0.55;
        const floorLimit = 10 - playerRadius;

        this.player.mesh.position.x = Math.max(
            -floorLimit,
            Math.min(floorLimit, this.player.mesh.position.x)
        );
        this.player.mesh.position.z = Math.max(
            -floorLimit,
            Math.min(floorLimit, this.player.mesh.position.z)
        );

        if (this.driveThru.isUnlocked()) {
            this.resolveBoxCollision(
                this.player.mesh.position,
                playerRadius,
                this.driveThru.counterPosition,
                0.65,
                1.2
            );
        }

        this.resolveBoxCollision(
            this.player.mesh.position,
            playerRadius,
            this.station.position,
            1.1,
            1.1
        );

        const sideCounterCenter = new THREE.Vector3(
            this.station.position.x + 1.65,
            0,
            this.station.position.z + 0.25
        );
        this.resolveBoxCollision(
            this.player.mesh.position,
            playerRadius,
            sideCounterCenter,
            0.75,
            0.85
        );

        this.resolveBoxCollision(
            this.player.mesh.position,
            playerRadius,
            this.tableCounter.position,
            this.tableCounter.halfExtents.x,
            this.tableCounter.halfExtents.z
        );

        this.resolveBoxCollision(
            this.player.mesh.position,
            playerRadius,
            this.deliveryCounter.position,
            this.deliveryCounter.halfExtents.x,
            this.deliveryCounter.halfExtents.z
        );

        this.resolveCircleCollision(
            this.player.mesh.position,
            playerRadius,
            this.trashBin.position,
            this.trashBin.radius
        );

        for (const table of this.tables) {
            this.resolveCircleCollision(
                this.player.mesh.position,
                playerRadius,
                table.position,
                table.radius
            );
        }
    }

    private startPickingPizzas(pizzas: THREE.Mesh[]): void {
        for (const pizza of pizzas) {
            const startWorld = new THREE.Vector3();
            pizza.getWorldPosition(startWorld);

            pizza.position.copy(startWorld);
            pizza.rotation.set(0, 0, 0);
            this.scene.add(pizza);

            this.pickingPizzas.push({
                mesh: pizza,
                start: startWorld,
                elapsed: 0,
                duration: 0.2
            });
        }
    }

    private updatePickingPizzas(dt: number): void {
        const targetWorld = new THREE.Vector3();
        this.player.mesh.getWorldPosition(targetWorld);
        targetWorld.y += 1.25 + this.player.getStackCount() * 0.16;

        for (let i = this.pickingPizzas.length - 1; i >= 0; i--) {
            const item = this.pickingPizzas[i];
            item.elapsed += dt;
            const t = Math.min(1, item.elapsed / item.duration);

            item.mesh.position.lerpVectors(item.start, targetWorld, t);
            item.mesh.position.y += Math.sin(t * Math.PI) * 0.9;

            if (t >= 1) {
                this.scene.remove(item.mesh);
                if (this.player.getAvailableSlots() > 0) {
                    this.player.addToStack([item.mesh]);
                }
                this.pickingPizzas.splice(i, 1);
            }
        }
    }

    private restackBoxes(stack: THREE.Group): void {
        stack.children.forEach((box, idx) => {
            box.position.set(0, idx * 0.22, 0);
        });
    }

    private getInFlightCount(target: DropTarget): number {
        return this.flyingPizzas.filter((f) => f.targetCounter === target).length;
    }

    private launchBoxFromWorldPos(startWorld: THREE.Vector3, targetCounter: DropTarget): void {
        const boxMesh = PizzaStation.createPizzaBoxMesh();
        boxMesh.position.copy(startWorld);
        this.scene.add(boxMesh);

        let targetWorld: THREE.Vector3;

        if (targetCounter === "drivethru") {
            const stackHeight = this.driveThru.getBoxCount() * 0.22;
            targetWorld = new THREE.Vector3(
                this.driveThru.counterPosition.x,
                1.26 + stackHeight,
                this.driveThru.counterPosition.z
            );
        } else {
            const counterObj = targetCounter === "table" ? this.tableCounter : this.deliveryCounter;
            const stackObj =
                targetCounter === "table" ? this.tableCounterBoxStack : this.deliveryCounterBoxStack;
            const stackHeight = stackObj.children.length * 0.22;

            targetWorld = new THREE.Vector3(
                counterObj.position.x,
                1.26 + stackHeight,
                counterObj.position.z
            );
        }

        this.flyingPizzas.push({
            mesh: boxMesh,
            start: startWorld,
            target: targetWorld,
            elapsed: 0,
            duration: 0.25,
            targetCounter
        });
    }

    private launchPlayerPizzaToCounter(targetCounter: DropTarget): void {
        const consumedPizza = this.player.popTopPizza();
        if (!consumedPizza) return;

        const startWorld = new THREE.Vector3();
        consumedPizza.getWorldPosition(startWorld);
        this.launchBoxFromWorldPos(startWorld, targetCounter);
    }

    private updateFlyingPizzas(dt: number): void {
        for (let i = this.flyingPizzas.length - 1; i >= 0; i--) {
            const item = this.flyingPizzas[i];
            item.elapsed += dt;
            const t = Math.min(1, item.elapsed / item.duration);

            item.mesh.position.lerpVectors(item.start, item.target, t);
            item.mesh.position.y += Math.sin(t * Math.PI) * 1.4;
            item.mesh.rotation.y += dt * 10;

            if (t >= 1) {
                this.scene.remove(item.mesh);

                if (item.targetCounter === "drivethru") {
                    this.driveThru.addBoxToCounter();
                } else if (item.targetCounter === "table") {
                    const boxOnCounter = PizzaStation.createPizzaBoxMesh();
                    this.tableCounterBoxStack.add(boxOnCounter);
                    this.restackBoxes(this.tableCounterBoxStack);
                    this.tableCounter.triggerDeliveryFeedback();
                } else {
                    const boxOnCounter = PizzaStation.createPizzaBoxMesh();
                    this.deliveryCounterBoxStack.add(boxOnCounter);
                    this.restackBoxes(this.deliveryCounterBoxStack);
                    this.deliveryCounter.triggerDeliveryFeedback();
                }
                this.flyingPizzas.splice(i, 1);
            }
        }
    }

    private updateCounterService(level: number): void {
        if (this.tableCounterBoxStack.children.length > 0) {
            const topTableBox =
                this.tableCounterBoxStack.children[this.tableCounterBoxStack.children.length - 1];
            const tablePayout = this.customers.tryServeTableCounter(topTableBox, level);

            if (tablePayout > 0) {
                this.tableCounterBoxStack.remove(topTableBox);
                this.restackBoxes(this.tableCounterBoxStack);
                this.money += tablePayout;

                const screenPos = this.projectWorldToScreen(
                    new THREE.Vector3(this.tableCounter.position.x, 2.2, this.tableCounter.position.z)
                );
                this.ui.spawnFloatingPopup(screenPos.x, screenPos.y, `+R$ ${tablePayout}`, "#0284c7");
            }
        }

        if (this.deliveryCounterBoxStack.children.length > 0) {
            const topDeliveryBox =
                this.deliveryCounterBoxStack.children[this.deliveryCounterBoxStack.children.length - 1];
            const deliveryPayout = this.customers.tryServeDeliveryCounter(topDeliveryBox, level);

            if (deliveryPayout > 0) {
                this.deliveryCounterBoxStack.remove(topDeliveryBox);
                this.restackBoxes(this.deliveryCounterBoxStack);
                this.money += deliveryPayout;

                const screenPos = this.projectWorldToScreen(
                    new THREE.Vector3(
                        this.deliveryCounter.position.x,
                        2.2,
                        this.deliveryCounter.position.z
                    )
                );
                this.ui.spawnFloatingPopup(screenPos.x, screenPos.y, `+R$ ${deliveryPayout}`, "#16a34a");
            }
        }
    }

    private updateTrashFlow(): void {
        for (const table of this.tables) {
            if (table.tryPickupEmptyBox(this.player.mesh.position)) {
                const trashBox = PizzaStation.createPizzaBoxMesh();
                trashBox.scale.setScalar(0.62);
                this.trashStack.add(trashBox);
                this.trashCount++;
            }
        }

        const baseHeight = this.player.getStackCount() * 0.16;
        this.trashStack.children.forEach((box, idx) => {
            box.position.set(0, baseHeight + idx * 0.18, 0);
        });

        if (this.trashCount > 0) {
            const distToBin = Math.hypot(
                this.player.mesh.position.x - this.trashBin.position.x,
                this.player.mesh.position.z - this.trashBin.position.z
            );
            if (distToBin <= 2.4) {
                this.trashCount = 0;
                this.trashStack.clear();
                this.trashBin.triggerFeedback();
            }
        }
    }

    private updateTableCashCollection(): void {
        for (const table of this.tables) {
            const cashPos = table.getCashWorldPosition();
            const collected = table.collectCash(this.player.mesh.position);
            if (collected > 0) {
                this.money += collected;
                const screenPos = this.projectWorldToScreen(cashPos);
                this.ui.spawnFloatingPopup(screenPos.x, screenPos.y, `+R$ ${collected}`, "#16a34a");
            }
        }
    }

    private loop = (now: number): void => {
        const dt = Math.min((now - this.lastTime) / 1000, 0.05);
        this.lastTime = now;

        this.saveTimer += dt;
        if (this.saveTimer >= 2.0) {
            this.saveTimer = 0;
            this.saveGame();
        }

        const levelInfo = this.getLevelInfo();

        this.station.update(dt);
        this.tableCounter.update(dt);
        this.deliveryCounter.update(dt);
        this.trashBin.update(dt);
        this.customers.update(dt, levelInfo.level);

        for (const table of this.tables) {
            table.update(dt);
        }

        const dir = this.input.getDirection();
        this.player.update(dt, dir);
        this.applyWorldCollisions();
        this.updateTrashFlow();
        this.updateTableCashCollection();
        this.helper.update(dt, this.tables, this.trashBin);

        // Zona de desbloqueio e atendimento do Drive-Thru
        const unlockResult = this.driveThru.updateUnlockPad(
            dt,
            this.player.mesh.position,
            this.money
        );
        if (unlockResult.unlockedNow) {
            this.money -= unlockResult.costPaid;
            this.saveGame();
            const screenPos = this.projectWorldToScreen(
                new THREE.Vector3(
                    this.driveThru.padPosition.x,
                    2.0,
                    this.driveThru.padPosition.z
                )
            );
            this.ui.spawnFloatingPopup(screenPos.x, screenPos.y, "DRIVE-THRU ABERTO!", "#ef4444");
        }

        const collected = this.station.collectPizzasForPlayer(
            this.player.mesh.position,
            this.player.getAvailableSlots()
        );
        if (collected.length > 0) {
            this.startPickingPizzas(collected);
        }

        this.updatePickingPizzas(dt);

        if (
            this.driveThru.updatePlayerDrop(
                dt,
                this.player.mesh.position,
                this.player.getStackCount(),
                this.getInFlightCount("drivethru")
            )
        ) {
            this.launchPlayerPizzaToCounter("drivethru");
        }

        const tableTotalCount =
            this.tableCounterBoxStack.children.length + this.getInFlightCount("table");
        const tableDrop = this.tableCounter.updateDelivery(
            dt,
            this.player.mesh.position,
            tableTotalCount < this.maxBoxesPerCounter ? this.player.getStackCount() : 0
        );
        if (tableDrop.delivered > 0) {
            this.launchPlayerPizzaToCounter("table");
        }

        const deliveryTotalCount =
            this.deliveryCounterBoxStack.children.length + this.getInFlightCount("delivery");
        const deliveryDrop = this.deliveryCounter.updateDelivery(
            dt,
            this.player.mesh.position,
            deliveryTotalCount < this.maxBoxesPerCounter ? this.player.getStackCount() : 0
        );
        if (deliveryDrop.delivered > 0) {
            this.launchPlayerPizzaToCounter("delivery");
        }

        const runnerDrop = this.deliveryHelper.update(
            dt,
            this.station,
            this.tableCounter,
            this.deliveryCounter,
            tableTotalCount,
            deliveryTotalCount
        );
        if (runnerDrop) {
            this.launchBoxFromWorldPos(runnerDrop.startWorld, runnerDrop.target);
        }

        this.updateFlyingPizzas(dt);
        this.updateCounterService(levelInfo.level);

        const driveThruEarned = this.driveThru.update(dt, levelInfo.level);
        if (driveThruEarned > 0) {
            this.money += driveThruEarned;
            const screenPos = this.projectWorldToScreen(
                new THREE.Vector3(
                    this.driveThru.counterPosition.x,
                    2.2,
                    this.driveThru.counterPosition.z
                )
            );
            this.ui.spawnFloatingPopup(screenPos.x, screenPos.y, `+R$ ${driveThruEarned}`, "#ef4444");
        }

        const updatedLevelInfo = this.getLevelInfo();
        this.ui.update(
            this.money,
            this.player.getStackCount(),
            this.player.maxStack,
            this.upgrades.getViews(),
            this.customers.getServedTotal(),
            updatedLevelInfo.level,
            updatedLevelInfo.progressText
        );

        this.camera.position.x = this.player.mesh.position.x + 12;
        this.camera.position.z = this.player.mesh.position.z + 12;
        this.camera.lookAt(this.player.mesh.position.x, 1, this.player.mesh.position.z);

        this.renderer.render(this.scene, this.camera);
        requestAnimationFrame(this.loop);
    };
}