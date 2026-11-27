import * as THREE from "three";
import { Player } from "../entities/Player";
import { PizzaStation } from "../entities/PizzaStation";
import { DeliveryCounter } from "../entities/DeliveryCounter";
import { InputController } from "../systems/InputController";
import { UIManager } from "../systems/UIManager";

export class GameEngine {
    private scene: THREE.Scene;
    private camera: THREE.PerspectiveCamera;
    private renderer: THREE.WebGLRenderer;
    private player: Player;
    private station: PizzaStation;
    private deliveryCounter: DeliveryCounter;
    private input: InputController;
    private ui: UIManager;
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

        this.input = new InputController(this.renderer.domElement);
        this.ui = new UIManager(container);
        this.ui.update(this.money, 0, this.player.maxStack);

        window.addEventListener("resize", () => this.onResize(container));
        this.loop(performance.now());
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
                // Caso raro em que o centro entra exatamente na caixa
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

        // Limites do chão de 20x20 (-10 a +10)
        this.player.mesh.position.x = Math.max(-floorLimit, Math.min(floorLimit, this.player.mesh.position.x));
        this.player.mesh.position.z = Math.max(-floorLimit, Math.min(floorLimit, this.player.mesh.position.z));

        // Bancada de produção (-4, -4) - tamanho visual ~2.6x2.6 -> meia-largura 1.3
        this.resolveBoxCollision(this.player.mesh.position, playerRadius, this.station.position, 1.3, 1.3);

        // Balcão de entrega (4, -4) - tamanho visual ~3.0x2.0 -> meia-largura 1.5 x 1.0
        this.resolveBoxCollision(
            this.player.mesh.position,
            playerRadius,
            this.deliveryCounter.position,
            this.deliveryCounter.halfExtents.x,
            this.deliveryCounter.halfExtents.z
        );
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
            this.player.addToStack(collected);
        }

        const delivery = this.deliveryCounter.updateDelivery(
            dt,
            this.player.mesh.position,
            this.player.getStackCount()
        );
        if (delivery.delivered > 0) {
            const removed = this.player.removeFromStack(delivery.delivered);
            if (removed > 0) {
                this.money += delivery.earned;
                this.deliveryCounter.triggerDeliveryFeedback();
            }
        }

        this.ui.update(this.money, this.player.getStackCount(), this.player.maxStack);

        this.camera.position.x = this.player.mesh.position.x + 12;
        this.camera.position.z = this.player.mesh.position.z + 12;
        this.camera.lookAt(this.player.mesh.position.x, 1, this.player.mesh.position.z);

        this.renderer.render(this.scene, this.camera);
        requestAnimationFrame(this.loop);
    };
}