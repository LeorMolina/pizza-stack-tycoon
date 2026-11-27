import * as THREE from "three";

export class DiningTable {
    public readonly mesh: THREE.Group;
    public readonly position: THREE.Vector3;
    public readonly radius = 1.05;
    private readonly ringMesh: THREE.Mesh;
    private readonly ringMat: THREE.MeshBasicMaterial;
    private readonly cashGroup: THREE.Group;
    private readonly cashLocalOffset = new THREE.Vector3(1.15, 0, 0.65);
    private dirtyBox: THREE.Object3D | null = null;
    private storedCash = 0;
    private bounceTime = 0;

    constructor(x: number, z: number) {
        this.position = new THREE.Vector3(x, 0, z);

        this.mesh = new THREE.Group();
        this.mesh.position.copy(this.position);

        const tableTopMat = new THREE.MeshStandardMaterial({
            color: 0xf97316,
            roughness: 0.38,
            metalness: 0.04
        });
        const tableTrimMat = new THREE.MeshStandardMaterial({
            color: 0xea580c,
            roughness: 0.45,
            metalness: 0.05
        });
        const metalMat = new THREE.MeshStandardMaterial({
            color: 0x334155,
            roughness: 0.4,
            metalness: 0.35
        });
        const chairMat = new THREE.MeshStandardMaterial({
            color: 0x0284c7,
            roughness: 0.42,
            metalness: 0.05
        });

        // Base e coluna central da mesa
        const basePlate = new THREE.Mesh(
            new THREE.CylinderGeometry(0.44, 0.48, 0.08, 20),
            metalMat
        );
        basePlate.position.y = 0.04;
        basePlate.receiveShadow = true;

        const pedestal = new THREE.Mesh(
            new THREE.CylinderGeometry(0.11, 0.13, 0.78, 16),
            metalMat
        );
        pedestal.position.y = 0.43;
        pedestal.castShadow = true;

        // Tampo quadrado laranja
        const tableBorder = new THREE.Mesh(
            new THREE.BoxGeometry(1.5, 0.12, 1.5),
            tableTrimMat
        );
        tableBorder.position.y = 0.84;
        tableBorder.castShadow = true;
        tableBorder.receiveShadow = true;

        const tableTop = new THREE.Mesh(
            new THREE.BoxGeometry(1.36, 0.04, 1.36),
            tableTopMat
        );
        tableTop.position.y = 0.91;
        tableTop.receiveShadow = true;

        // Duas cadeiras azuis com encosto (esquerda e direita)
        const leftChair = this.createChairMesh(chairMat, metalMat);
        leftChair.position.set(-1.02, 0, 0);
        leftChair.rotation.y = Math.PI / 2;

        const rightChair = this.createChairMesh(chairMat, metalMat);
        rightChair.position.set(1.02, 0, 0);
        rightChair.rotation.y = -Math.PI / 2;

        // Anel indicador no piso (visível quando há caixa suja ou dinheiro)
        this.ringMat = new THREE.MeshBasicMaterial({
            color: 0xf97316,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.85
        });
        this.ringMesh = new THREE.Mesh(
            new THREE.RingGeometry(1.22, 1.42, 32),
            this.ringMat
        );
        this.ringMesh.rotation.x = -Math.PI / 2;
        this.ringMesh.position.y = 0.025;
        this.ringMesh.visible = false;

        // Grupo das pilhas de dinheiro no chão
        this.cashGroup = new THREE.Group();
        this.cashGroup.position.copy(this.cashLocalOffset);

        this.mesh.add(
            basePlate,
            pedestal,
            tableBorder,
            tableTop,
            leftChair,
            rightChair,
            this.ringMesh,
            this.cashGroup
        );
    }

    private createChairMesh(
        chairMat: THREE.Material,
        legMat: THREE.Material
    ): THREE.Group {
        const chair = new THREE.Group();

        const seat = new THREE.Mesh(
            new THREE.BoxGeometry(0.56, 0.1, 0.54),
            chairMat
        );
        seat.position.y = 0.46;
        seat.castShadow = true;
        seat.receiveShadow = true;

        const backrest = new THREE.Mesh(
            new THREE.BoxGeometry(0.56, 0.52, 0.1),
            chairMat
        );
        backrest.position.set(0, 0.74, -0.22);
        backrest.castShadow = true;

        const legGeo = new THREE.BoxGeometry(0.07, 0.44, 0.07);
        const legOffsets: [number, number][] = [
            [-0.21, -0.2],
            [0.21, -0.2],
            [-0.21, 0.2],
            [0.21, 0.2]
        ];
        for (const [lx, lz] of legOffsets) {
            const leg = new THREE.Mesh(legGeo, legMat);
            leg.position.set(lx, 0.22, lz);
            leg.castShadow = true;
            chair.add(leg);
        }

        chair.add(seat, backrest);
        return chair;
    }

    private createCashBundleMesh(): THREE.Group {
        const bundle = new THREE.Group();

        const billMat = new THREE.MeshStandardMaterial({
            color: 0x22c55e,
            roughness: 0.45,
            metalness: 0.05
        });
        const bandMat = new THREE.MeshStandardMaterial({
            color: 0xfef08a,
            roughness: 0.4
        });

        const bills = new THREE.Mesh(
            new THREE.BoxGeometry(0.42, 0.11, 0.24),
            billMat
        );
        bills.position.y = 0.055;
        bills.castShadow = true;
        bills.receiveShadow = true;

        const band = new THREE.Mesh(
            new THREE.BoxGeometry(0.11, 0.116, 0.248),
            bandMat
        );
        band.position.y = 0.055;

        bundle.add(bills, band);
        return bundle;
    }

    private rebuildCashMeshes(): void {
        this.cashGroup.clear();
        if (this.storedCash <= 0) {
            this.updateIndicatorRing();
            return;
        }

        const bundleCount = Math.min(24, Math.max(1, Math.ceil(this.storedCash / 6)));
        const cols = 2;
        const rows = 2;
        const perLayer = cols * rows;

        for (let i = 0; i < bundleCount; i++) {
            const layer = Math.floor(i / perLayer);
            const slotInLayer = i % perLayer;
            const col = slotInLayer % cols;
            const row = Math.floor(slotInLayer / cols);

            const bundle = this.createCashBundleMesh();
            bundle.position.set(
                (col - 0.5) * 0.48,
                layer * 0.115,
                (row - 0.5) * 0.3
            );
            this.cashGroup.add(bundle);
        }

        this.updateIndicatorRing();
    }

    private updateIndicatorRing(): void {
        if (this.dirtyBox !== null) {
            this.ringMesh.visible = true;
            this.ringMat.color.setHex(0xf97316);
        } else if (this.storedCash > 0) {
            this.ringMesh.visible = true;
            this.ringMat.color.setHex(0x22c55e);
        } else {
            this.ringMesh.visible = false;
        }
    }

    public isAvailable(): boolean {
        return this.dirtyBox === null;
    }

    public hasEmptyBox(): boolean {
        return this.dirtyBox !== null;
    }

    public getStoredCash(): number {
        return this.storedCash;
    }

    public getCashWorldPosition(): THREE.Vector3 {
        return new THREE.Vector3(
            this.position.x + this.cashLocalOffset.x,
            0.8,
            this.position.z + this.cashLocalOffset.z
        );
    }

    public addCash(amount: number): void {
        if (amount <= 0) return;
        this.storedCash += Math.round(amount);
        this.bounceTime = 0.22;
        this.rebuildCashMeshes();
    }

    public collectCash(collectorPos: THREE.Vector3): number {
        if (this.storedCash <= 0) return 0;

        const cashWorldX = this.position.x + this.cashLocalOffset.x;
        const cashWorldZ = this.position.z + this.cashLocalOffset.z;
        const distToCash = Math.hypot(collectorPos.x - cashWorldX, collectorPos.z - cashWorldZ);
        const distToTable = Math.hypot(
            collectorPos.x - this.position.x,
            collectorPos.z - this.position.z
        );

        if (distToCash > 1.75 && distToTable > 2.05) {
            return 0;
        }

        const collected = this.storedCash;
        this.storedCash = 0;
        this.bounceTime = 0.2;
        this.rebuildCashMeshes();
        return collected;
    }

    public placeEmptyBox(boxMesh: THREE.Object3D): void {
        if (this.dirtyBox) {
            this.mesh.remove(this.dirtyBox);
        }
        boxMesh.position.set(0, 0.93, 0);
        boxMesh.rotation.set(0, 0.25, 0);
        this.mesh.add(boxMesh);
        this.dirtyBox = boxMesh;
        this.bounceTime = 0.2;
        this.updateIndicatorRing();
    }

    public tryPickupEmptyBox(collectorPos: THREE.Vector3): boolean {
        if (!this.dirtyBox) return false;

        const dist = Math.hypot(
            collectorPos.x - this.position.x,
            collectorPos.z - this.position.z
        );
        if (dist > 2.15) return false;

        this.mesh.remove(this.dirtyBox);
        this.dirtyBox = null;
        this.bounceTime = 0.18;
        this.updateIndicatorRing();
        return true;
    }

    public update(dt: number): void {
        if (this.bounceTime > 0) {
            this.bounceTime = Math.max(0, this.bounceTime - dt);
            const t = 1 - this.bounceTime / 0.22;
            const s = 1 + Math.sin(t * Math.PI) * 0.06;
            this.mesh.scale.set(s, 1 / s, s);
        } else {
            this.mesh.scale.set(1, 1, 1);
        }

        if (this.ringMesh.visible) {
            const pulse = 1 + Math.sin(performance.now() * 0.006) * 0.045;
            this.ringMesh.scale.set(pulse, pulse, 1);
        }
    }
}