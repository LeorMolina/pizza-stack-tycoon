import * as THREE from "three";

export class DiningTable {
    public readonly mesh: THREE.Group;
    public readonly position: THREE.Vector3;
    public readonly radius = 1.05;
    public hasDirtyBox = false;
    private readonly boxAnchor: THREE.Group;
    private readonly dirtyIndicator: THREE.Mesh;

    constructor(x: number, z: number) {
        this.position = new THREE.Vector3(x, 0, z);
        this.mesh = new THREE.Group();
        this.mesh.position.copy(this.position);

        const woodMat = new THREE.MeshStandardMaterial({
            color: 0x92400e,
            roughness: 0.5,
            metalness: 0.04
        });
        const clothMat = new THREE.MeshStandardMaterial({
            color: 0xfef2f2,
            roughness: 0.65,
            metalness: 0.02
        });
        const stoolMat = new THREE.MeshStandardMaterial({
            color: 0xb45309,
            roughness: 0.55,
            metalness: 0.04
        });

        const leg = new THREE.Mesh(
            new THREE.CylinderGeometry(0.14, 0.22, 0.88, 20),
            woodMat
        );
        leg.position.y = 0.44;
        leg.castShadow = true;
        leg.receiveShadow = true;

        const top = new THREE.Mesh(
            new THREE.CylinderGeometry(0.95, 0.95, 0.1, 28),
            clothMat
        );
        top.position.y = 0.92;
        top.castShadow = true;
        top.receiveShadow = true;

        const trim = new THREE.Mesh(
            new THREE.TorusGeometry(0.92, 0.035, 10, 28),
            woodMat
        );
        trim.rotation.x = Math.PI / 2;
        trim.position.y = 0.87;

        this.mesh.add(leg, top, trim);

        const stoolOffsets: [number, number][] = [
            [-1.25, 0],
            [1.25, 0]
        ];
        for (const [sx, sz] of stoolOffsets) {
            const stoolGroup = new THREE.Group();
            const seat = new THREE.Mesh(
                new THREE.CylinderGeometry(0.28, 0.28, 0.08, 20),
                stoolMat
            );
            seat.position.y = 0.52;
            seat.castShadow = true;

            const post = new THREE.Mesh(
                new THREE.CylinderGeometry(0.07, 0.1, 0.48, 14),
                woodMat
            );
            post.position.y = 0.24;
            post.castShadow = true;

            stoolGroup.add(seat, post);
            stoolGroup.position.set(sx, 0, sz);
            this.mesh.add(stoolGroup);
        }

        this.boxAnchor = new THREE.Group();
        this.boxAnchor.position.set(0, 0.98, 0);
        this.mesh.add(this.boxAnchor);

        this.dirtyIndicator = new THREE.Mesh(
            new THREE.RingGeometry(1.15, 1.38, 28),
            new THREE.MeshBasicMaterial({
                color: 0xf59e0b,
                side: THREE.DoubleSide
            })
        );
        this.dirtyIndicator.rotation.x = -Math.PI / 2;
        this.dirtyIndicator.position.y = 0.03;
        this.dirtyIndicator.visible = false;
        this.mesh.add(this.dirtyIndicator);
    }

    public isAvailable(): boolean {
        return !this.hasDirtyBox;
    }

    public placeEmptyBox(boxMesh: THREE.Object3D): void {
        this.hasDirtyBox = true;
        this.boxAnchor.clear();
        boxMesh.position.set(0, 0, 0);
        boxMesh.rotation.set(0, 0.25, 0);
        boxMesh.scale.setScalar(0.75);
        this.boxAnchor.add(boxMesh);
        this.dirtyIndicator.visible = true;
    }

    public tryPickupEmptyBox(playerPos: THREE.Vector3): boolean {
        if (!this.hasDirtyBox) return false;
        const dist = Math.hypot(playerPos.x - this.position.x, playerPos.z - this.position.z);
        if (dist <= 2.7) {
            this.hasDirtyBox = false;
            this.boxAnchor.clear();
            this.dirtyIndicator.visible = false;
            return true;
        }
        return false;
    }

    public update(dt: number): void {
        if (this.dirtyIndicator.visible) {
            const s = 1 + Math.sin(performance.now() * 0.007) * 0.06;
            this.dirtyIndicator.scale.set(s, s, 1);
        }
        void dt;
    }
}