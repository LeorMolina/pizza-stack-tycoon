import * as THREE from "three";
import { Player } from "../entities/Player";
import { PizzaStation } from "../entities/PizzaStation";
import { DeliveryCounter } from "../entities/DeliveryCounter";
import { InputController } from "../systems/InputController";
import { UIManager } from "../systems/UIManager";
import { UpgradeSystem } from "../systems/UpgradeSystem";
import type { UpgradeId } from "../systems/UpgradeSystem";

interface FlyingPizza {
    mesh: THREE.Mesh;
    start: THREE.Vector3;
    target: THREE.Vector3;
    elapsed: number;
    duration: number;
    earned: number;
}

interface PickingPizza {
    mesh: THREE.Mesh;
    start: THREE.Vector3;
    elapsed: number;
    duration: number;
}

export class GameEngine {
    private scene: THREE.Scene;
    private camera: THREE.PerspectiveCamera;
    private renderer: THREE.WebGLRenderer;
    private player: Player;
    private station: PizzaStation;
    private deliveryCounter: DeliveryCounter;
    private input: InputController;
    private ui: UIManager;
    private upgrades: UpgradeSystem;
    private flyingPizzas: FlyingPizza[] = [];
    private pickingPizzas: PickingPizza[] = [];
    private money = 0;
    private lastTime = performance.now();

    constructor(container: HTMLElement) {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0xf1f5f9);

        const aspect = container.clientWidth / container.clientHeight;
        this.camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 100);
        this.camera.position.set(12, 14, 12);
        this.camera.lookAt(0, 0, 0);

        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(container.clientWidth, container.clientHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        container.appendChild(this.renderer.domElement);
        this.renderer.domElement.style.touchAction = "none";

        const ambient = new THREE.AmbientLight(0xffffff, 0.7);
        const dirLight = new THREE.DirectionalLight(0xffffff, 1.1);
        dirLight.position.set(10, 18, 10);
        dirLight.castShadow = true;
        this.scene.add(ambient, dirLight);

        const floor = new THREE.Mesh(
            new THREE.BoxGeometry(20, 0.5, 20),
            new THREE.MeshStandardMaterial({ color: 0xfde68a })
        );
        floor.position.y = -0.25;
        floor.receiveShadow = true;
        this.scene.add(floor);

        this.station = new PizzaStation(-4, -4);
        this.scene.add(this.station.mesh);

        this.deliveryCounter = new DeliveryCounter(4, -4);
        this.scene.add(this.deliveryCounter.mesh);

        this.player = new Player();
        this.scene.add(this.player.mesh);

        this.upgrades = new UpgradeSystem();
        this.input = new InputController(this.renderer.domElement);
        this.ui = new UIManager(container, (id) => this.handleUpgrade(id));
        this.ui.update(this.money, 0, this.player.maxStack, this.upgrades.getViews());

        window.addEventListener("resize", () => this.onResize(container));
        this.loop(performance.now());
    }

    private handleUpgrade(id: UpgradeId): void {
        const result = this.upgrades.tryBuy(id, this.money, this.player, this.station);
        if (result.purchased) {
            this.money = result.newMoney;
            this.ui.update(
                this.money,
                this.player.getStackCount(),
                this.player.maxStack,
                this.upgrades.getViews()
            );
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

    private applyWorldCollisions(): void {
        const playerRadius = 0.55;
        const floorLimit = 10 - playerRadius;

        this.player.mesh.position.x = Math.max(-floorLimit, Math.min(floorLimit, this.player.mesh.position.x));
        this.player.mesh.position.z = Math.max(-floorLimit, Math.min(floorLimit, this.player.mesh.position.z));

        this.resolveBoxCollision(this.player.mesh.position, playerRadius, this.station.position, 1.3, 1.3);
        this.resolveBoxCollision(
            this.player.mesh.position,
            playerRadius,
            this.deliveryCounter.position,
            this.deliveryCounter.halfExtents.x,
            this.deliveryCounter.halfExtents.z
        );
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
        targetWorld.y += 1.35 + this.player.getStackCount() * 0.16;

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

    private launchPizzaToCounter(earned: number): void {
        const pizzaMesh = this.player.popTopPizza();
        if (!pizzaMesh) return;

        const startWorld = new THREE.Vector3();
        pizzaMesh.getWorldPosition(startWorld);

        pizzaMesh.position.copy(startWorld);
        pizzaMesh.rotation.set(0, 0, 0);
        this.scene.add(pizzaMesh);

        const targetWorld = new THREE.Vector3(
            this.deliveryCounter.position.x,
            1.48,
            this.deliveryCounter.position.z
        );

        this.flyingPizzas.push({
            mesh: pizzaMesh,
            start: startWorld,
            target: targetWorld,
            elapsed: 0,
            duration: 0.25,
            earned
        });
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
                this.money += item.earned;
                this.deliveryCounter.triggerDeliveryFeedback();
                this.flyingPizzas.splice(i, 1);
            }
        }
    }

    private loop = (now: number): void => {
        const dt = Math.min((now - this.lastTime) / 1000, 0.05);
        this.lastTime = now;

        this.station.update(dt);
        this.deliveryCounter.update(dt);

        const dir = this.input.getDirection();
        this.player.update(dt, dir);
        this.applyWorldCollisions();

        const collected = this.station.collectPizzasForPlayer(
            this.player.mesh.position,
            this.player.getAvailableSlots()
        );
        if (collected.length > 0) {
            this.startPickingPizzas(collected);
        }

        this.updatePickingPizzas(dt);

        const delivery = this.deliveryCounter.updateDelivery(
            dt,
            this.player.mesh.position,
            this.player.getStackCount()
        );
        if (delivery.delivered > 0) {
            this.launchPizzaToCounter(delivery.earned);
        }

        this.updateFlyingPizzas(dt);

        this.ui.update(
            this.money,
            this.player.getStackCount(),
            this.player.maxStack,
            this.upgrades.getViews()
        );

        this.camera.position.x = this.player.mesh.position.x + 12;
        this.camera.position.z = this.player.mesh.position.z + 12;
        this.camera.lookAt(this.player.mesh.position.x, 1, this.player.mesh.position.z);

        this.renderer.render(this.scene, this.camera);
        requestAnimationFrame(this.loop);
    };
}