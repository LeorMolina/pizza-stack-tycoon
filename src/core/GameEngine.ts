import * as THREE from "three";
import { Player } from "../entities/Player";
import { InputController } from "../systems/InputController";

export class GameEngine {
    private scene: THREE.Scene;
    private camera: THREE.PerspectiveCamera;
    private renderer: THREE.WebGLRenderer;
    private player: Player;
    private input: InputController;
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

        this.player = new Player();
        this.scene.add(this.player.mesh);

        this.input = new InputController(this.renderer.domElement);

        window.addEventListener("resize", () => this.onResize(container));
        this.loop(performance.now());
    }

    private onResize(container: HTMLElement): void {
        this.camera.aspect = container.clientWidth / container.clientHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(container.clientWidth, container.clientHeight);
    }

    private loop = (now: number): void => {
        const dt = Math.min((now - this.lastTime) / 1000, 0.05);
        this.lastTime = now;

        const dir = this.input.getDirection();
        this.player.update(dt, dir);

        this.camera.position.x = this.player.mesh.position.x + 12;
        this.camera.position.z = this.player.mesh.position.z + 12;
        this.camera.lookAt(this.player.mesh.position.x, 1, this.player.mesh.position.z);

        this.renderer.render(this.scene, this.camera);
        requestAnimationFrame(this.loop);
    };
}