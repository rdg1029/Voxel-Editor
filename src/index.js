import * as THREE from 'three';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls';

class World {
    constructor(chunkSize) {
        this.chunkSize = chunkSize;
        this.chunkSliceSize = chunkSize * chunkSize;
        this.chunk = new Uint8Array(chunkSize * chunkSize * chunkSize);
        this.faces = [
            { //left
                dir: [-1, 0, 0],
                //정육면체를 정면으로 봤을 때, 맨 앞쪽 면에서 왼쪽 아래 꼭짓점 => (0, 0, 0)
                corners: [
                    [0, 1, 0],
                    [0, 0, 0],
                    [0, 1, 1],
                    [0, 0, 1],
                ],
            },
            { //right
                dir: [1, 0, 0],
                corners: [
                    [1, 1, 1],
                    [1, 0, 1],
                    [1, 1, 0],
                    [1, 0, 0],
                ],
            },
            { //down
                dir: [0, -1, 0],
                corners: [
                    [1, 0, 1],
                    [0, 0, 1],
                    [1, 0, 0],
                    [0, 0, 0],
                ],
            },
            { //up
                dir: [0, 1, 0],
                corners: [
                    [0, 1, 1],
                    [1, 1, 1],
                    [0, 1, 0],
                    [1, 1, 0],
                ],
            },
            { //back
                dir: [0, 0, -1],
                corners: [
                    [1, 0, 0],
                    [0, 0, 0],
                    [1, 1, 0],
                    [0, 1, 0],
                ],
            },
            { //front
                dir: [0, 0, 1],
                corners: [
                    [0, 0, 1],
                    [1, 0, 1],
                    [0, 1, 1],
                    [1, 1, 1],
                ],
            },
        ]
    }
    getChunkForVoxel(x, y, z) {
        const { chunkSize } = this;
        const chunkX = Math.floor(x / chunkSize);
        const chunkY = Math.floor(y / chunkSize);
        const chunkZ = Math.floor(z / chunkSize);
        // chunk (0, 0, 0)만 허용
        if (chunkX !== 0 || chunkY !== 0 || chunkZ !== 0) return null;
        return this.chunk;
    }
    computeVoxelOffset(x, y, z) {
        const { chunkSize, chunkSliceSize } = this;
        const voxelX = THREE.MathUtils.euclideanModulo(x, chunkSize) | 0;
        const voxelY = THREE.MathUtils.euclideanModulo(y, chunkSize) | 0;
        const voxelZ = THREE.MathUtils.euclideanModulo(z, chunkSize) | 0;
        return voxelY * chunkSliceSize + voxelZ * chunkSize + voxelX;
    }
    setVoxel(x, y, z, v) {
        const chunk = this.getChunkForVoxel(x, y, z);
        if (!chunk) return;
        const voxelOffset = this.computeVoxelOffset(x, y, z);
        chunk[voxelOffset] = v;
    }
    getVoxel(x, y, z) {
        const chunk = this.getChunkForVoxel(x, y, z);
        if (!chunk) return 0;
        const voxelOffset = this.computeVoxelOffset(x, y, z);
        return chunk[voxelOffset];
    }
    generateGeometryData(chunkX, chunkY, chunkZ) {
        const { chunkSize } = this;

        //BufferAttribute for BufferGeometry
        const positions = []; // 정점 (꼭짓점) 위치
        const normals = []; // 법선 => 면이 바라보는 방향(벡터)
        const index = []; // 정점, 법선을 합친 배열 데이터(?)

        // chunk의 시작 좌표
        const startX = chunkX * chunkSize;
        const startY = chunkY * chunkSize;
        const startZ = chunkZ * chunkSize;

        for(let y = 0; y < chunkSize; ++y) {
            const voxelY = startY + y;
            for(let z = 0; z < chunkSize; ++z) {
                const voxelZ = startZ + z;
                for(let x = 0; x < chunkSize; ++x) {
                    const voxelX = startX + x;

                    const voxel = this.getVoxel(voxelX, voxelY, voxelZ);
                    if (voxel) {
                        for (const { dir, corners } of this.faces) {
                            const neihbor = this.getVoxel(voxelX + dir[0], voxelY + dir[1], voxelZ + dir[2]);
                            if (!neihbor) {
                                const ndx = positions.length / 3;
                                for (const pos of corners) {
                                    positions.push(pos[0] + x, pos[1] + y, pos[2] + z);
                                    normals.push(...dir);
                                }
                                index.push(ndx, ndx + 1, ndx + 2, ndx + 2, ndx + 1, ndx + 3);
                            }
                        }
                    }
                }
            }
        }
        return {positions, normals, index};
    }
}

const clock = new THREE.Clock();
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(70, window.innerWidth/window.innerHeight, 0.1, 100);
camera.position.set(16, 2, 16);
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);
const pointerLockControls = new PointerLockControls(camera, document.body);

const movKey = new Map([
    ['KeyW', false],
    ['KeyS', false],
    ['KeyA', false],
    ['KeyD', false],
    ['Space', false],
    ['ShiftLeft', false]
]);
function updateControls(delta) {
    const movSpeed = 10 * delta;
    if (movKey.get('KeyW')) {
        pointerLockControls.moveForward(movSpeed);
    }
    if (movKey.get('KeyS')) {
        pointerLockControls.moveForward(-movSpeed);
    }
    if (movKey.get('KeyA')) {
        pointerLockControls.moveRight(-movSpeed);
    }
    if (movKey.get('KeyD')) {
        pointerLockControls.moveRight(movSpeed);
    }
    if (movKey.get('Space')) {
        camera.position.y += movSpeed;
    }
    if (movKey.get('ShiftLeft')) {
        camera.position.y -= movSpeed;
    }
}

document.body.addEventListener('click', () => {
    pointerLockControls.lock();
});
window.addEventListener('keydown', e => {
    if (!movKey.has(e.code)) return;
    movKey.set(e.code, true);
});
window.addEventListener('keyup', e => {
    if (!movKey.has(e.code)) return;
    movKey.set(e.code, false);
});

// Set World
const CHUNK_SIZE = 32;
const world = new World(CHUNK_SIZE);

for (let z = 0; z < CHUNK_SIZE; z++) {
    for (let x = 0; x < CHUNK_SIZE; x++) {
        world.setVoxel(x, 0, z, 1);
    }
}

const { positions, normals, index } = world.generateGeometryData(0, 0, 0);
const geometry = new THREE.BufferGeometry();
const material = new THREE.MeshBasicMaterial({color: 'green'});

const positionNumComponents = 3;
const normalNumComponents = 3;

geometry.setAttribute(
    'position',
    new THREE.BufferAttribute(new Float32Array(positions), positionNumComponents)
);
geometry.setAttribute(
    'normal',
    new THREE.BufferAttribute(new Float32Array(normals), normalNumComponents)
);
geometry.setIndex(index);

const voxelMesh = new THREE.Mesh(geometry, material);
scene.add(voxelMesh);

renderer.setAnimationLoop(() => {
    const delta = clock.getDelta();
    updateControls(delta);
    renderer.render(scene, camera);
});