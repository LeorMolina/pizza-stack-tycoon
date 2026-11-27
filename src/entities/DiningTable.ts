import * as THREE from "three";

export class DiningTable {
    public readonly mesh: THREE.Group;
    public readonly position: THREE.Vector3;
    public readonly radius = 1.05;

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

        // Dois banquinhos arredondados nas laterais
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
    }
}