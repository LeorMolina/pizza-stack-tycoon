import * as THREE from "three";

export class DeliveryCounter {
    public readonly mesh: THREE.Group;
    public readonly position: THREE.Vector3;
    public readonly halfExtents: THREE.Vector2;
    private readonly ringMesh: THREE.Mesh;
    private readonly accentColor: number;
    private readonly payoutPerPizza: number;
    private deliverTimer = 0;
    private readonly deliverInterval = 0.14;
    private bounceTime = 0;

    constructor(
        x: number,
        z: number,
        accentColor = 0x0284c7,
        payoutPerPizza = 15,
        width = 5.4
    ) {
        this.position = new THREE.Vector3(x, 0, z);
        this.accentColor = accentColor;
        this.payoutPerPizza = payoutPerPizza;
        this.halfExtents = new THREE.Vector2(width / 2, 0.72);

        this.mesh = new THREE.Group();
        this.mesh.position.copy(this.position);

        const bodyMat = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            roughness: 0.4,
            metalness: 0.03
        });
        const accentMat = new THREE.MeshStandardMaterial({
            color: this.accentColor,
            roughness: 0.35,
            metalness: 0.05
        });
        const topMat = new THREE.MeshStandardMaterial({
            color: 0xfef9c3,
            roughness: 0.35
        });
        const darkBaseMat = new THREE.MeshStandardMaterial({
            color: 0x1e293b,
            roughness: 0.5
        });

        // Rodapé escuro
        const plinth = new THREE.Mesh(
            new THREE.BoxGeometry(width - 0.08, 0.16, 1.32),
            darkBaseMat
        );
        plinth.position.y = 0.08;
        plinth.receiveShadow = true;

        // Corpo principal branco
        const counter = new THREE.Mesh(
            new THREE.BoxGeometry(width, 0.92, 1.4),
            bodyMat
        );
        counter.position.y = 0.62;
        counter.castShadow = true;
        counter.receiveShadow = true;

        // Faixa colorida vibrante do setor (Azul = Mesas, Laranja = Delivery)
        const stripe = new THREE.Mesh(
            new THREE.BoxGeometry(width + 0.02, 0.24, 1.44),
            accentMat
        );
        stripe.position.y = 0.88;

        // Tampo superior claro
        const counterTop = new THREE.Mesh(
            new THREE.BoxGeometry(width + 0.04, 0.08, 1.48),
            topMat
        );
        counterTop.position.y = 1.12;
        counterTop.castShadow = true;
        counterTop.receiveShadow = true;

        // Placa indicadora colorida na ponta do setor
        const signPost = new THREE.Mesh(
            new THREE.BoxGeometry(0.1, 0.52, 0.1),
            accentMat
        );
        signPost.position.set(-width / 2 + 0.35, 1.38, 0.45);

        const signBoard = new THREE.Mesh(
            new THREE.BoxGeometry(0.55, 0.34, 0.12),
            accentMat
        );
        signBoard.position.set(-width / 2 + 0.35, 1.66, 0.45);

        // Anel de entrega no lado da cozinha (z = -1.45 relativo ao balcão)
        const ringGeo = new THREE.RingGeometry(0.9, 1.12, 32);
        const ringMat = new THREE.MeshBasicMaterial({
            color: this.accentColor,
            side: THREE.DoubleSide
        });
        this.ringMesh = new THREE.Mesh(ringGeo, ringMat);
        this.ringMesh.rotation.x = -Math.PI / 2;
        this.ringMesh.position.set(0, 0.025, -1.45);

        this.mesh.add(
            plinth,
            counter,
            stripe,
            counterTop,
            signPost,
            signBoard,
            this.ringMesh
        );
    }

    public triggerDeliveryFeedback(): void {
        this.bounceTime = 0.18;
    }

    updateDelivery(
        dt: number,
        playerPos: THREE.Vector3,
        playerStackCount: number
    ): { delivered: number; earned: number } {
        const dropCenterZ = this.position.z - 1.45;
        const dist = Math.hypot(
            playerPos.x - this.position.x,
            playerPos.z - dropCenterZ
        );
        const insideZone = dist <= 1.55;

        if (!insideZone || playerStackCount <= 0) {
            this.deliverTimer = 0;
            return { delivered: 0, earned: 0 };
        }

        this.deliverTimer += dt;
        if (this.deliverTimer >= this.deliverInterval) {
            this.deliverTimer = 0;
            return { delivered: 1, earned: this.payoutPerPizza };
        }

        return { delivered: 0, earned: 0 };
    }

    update(dt: number): void {
        if (this.bounceTime > 0) {
            this.bounceTime = Math.max(0, this.bounceTime - dt);
            const t = 1 - this.bounceTime / 0.18;
            const s = 1 + Math.sin(t * Math.PI) * 0.05;
            this.mesh.scale.set(1, s, 1);
        } else {
            this.mesh.scale.set(1, 1, 1);
        }

        const pulse = 1 + Math.sin(performance.now() * 0.005) * 0.04;
        this.ringMesh.scale.set(pulse, pulse, 1);
    }
}