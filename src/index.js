import * as THREE from 'three';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls';
import { voxelData, getRGB } from './voxel_data';
import { Palette } from './palette';

class World {
    constructor(chunkSize) {
        this.chunkSize = chunkSize;
        this.chunkSliceSize = chunkSize * chunkSize;
        // this.chunk = new Uint8Array(chunkSize * chunkSize * chunkSize);
        this.chunks = {};
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
    computeChunkId(x, y, z) {
        const { chunkSize } = this;
        const chunkX = Math.floor(x / chunkSize);
        const chunkY = Math.floor(y / chunkSize);
        const chunkZ = Math.floor(z / chunkSize);
        return `${chunkX},${chunkY},${chunkZ}`;
    }
    getChunkForVoxel(x, y, z) {
        return this.chunks[this.computeChunkId(x, y, z)];
    }
    computeVoxelOffset(x, y, z) {
        const { chunkSize, chunkSliceSize } = this;
        const voxelX = THREE.MathUtils.euclideanModulo(x, chunkSize) | 0;
        const voxelY = THREE.MathUtils.euclideanModulo(y, chunkSize) | 0;
        const voxelZ = THREE.MathUtils.euclideanModulo(z, chunkSize) | 0;
        return voxelY * chunkSliceSize + voxelZ * chunkSize + voxelX;
    }
    setVoxel(x, y, z, v) {
        let chunk = this.getChunkForVoxel(x, y, z);
        if (!chunk) {
            chunk = this.addChunkForVoxel(x, y, z);
        }
        const voxelOffset = this.computeVoxelOffset(x, y, z);
        chunk[voxelOffset] = v;
    }
    addChunkForVoxel(x, y, z) {
        const chunkId = this.computeChunkId(x, y, z);
        let chunk = this.chunks[chunkId];
        if (!chunk) {
            const { chunkSize } = this;
            chunk = new Uint8Array(chunkSize * chunkSize * chunkSize);
            this.chunks[chunkId] = chunk;
        }
        return chunk;
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
        const positions = []; // 정점 (꼭짓점) 위치 데이터
        const normals = []; // 법선 => 면이 바라보는 방향(벡터) 데이터
        const colors = []; // 색 데이터 (r, g, b)
        const index = []; // 정점 좌표 배열

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
                                    colors.push(...getRGB(voxelData[voxel]));
                                }
                                index.push(ndx, ndx + 1, ndx + 2, ndx + 2, ndx + 1, ndx + 3);
                            }
                        }
                    }
                }
            }
        }
        return {positions, normals, colors, index};
    }
}

function onWindowLoaded() {
    const clock = new THREE.Clock();
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#87ceeb');

    const camera = new THREE.PerspectiveCamera(70, window.innerWidth/window.innerHeight, 0.1, 100);
    camera.position.set(16, 2, 16);

    const renderer = new THREE.WebGLRenderer();
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    const light = new THREE.HemisphereLight(0xffffff, 0xcccccc, 1)
    scene.add(light);

    const pointerLockControls = new PointerLockControls(camera, document.body);

    // Define voxel material
    const material = new THREE.MeshLambertMaterial({vertexColors: THREE.VertexColors});

    // Define voxel helper
    const voxelHelperGeometry = new THREE.BoxGeometry(1.001, 1.001, 1.001);
    const voxelHelperMaterial = new THREE.MeshBasicMaterial({color: 0xffffff, opacity: 0.5, transparent: true});
    const voxelHelperMesh = new THREE.Mesh(voxelHelperGeometry, voxelHelperMaterial);

    // Set crosshair & raycaster
    const crossHairPos = new THREE.Vector2(0, 0);
    const raycaster = new THREE.Raycaster();

    const neighborOffsets = [
        [0, 0, 0], // 자신
        [-1, 0, 0], // 왼쪽
        [1, 0, 0], // 오른쪽
        [0, -1, 0], // 아래
        [0, 1, 0], // 위
        [0, 0, -1], // 뒤
        [0, 0, 1], // 앞
    ];
    const chunkIdToMesh = new Map();
    
    const movKey = new Map([
        ['KeyW', false],
        ['KeyS', false],
        ['KeyA', false],
        ['KeyD', false],
        ['Space', false],
        ['ShiftLeft', false]
    ]);
    //Set Palette
    const palette = new Palette();

    function updateControls(delta) {
        const movSpeed = 16 * delta;
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
    // Update voxel & chunk functions
    function updateVoxelGeometry(x, y, z) {
        const updatedChunkIds = new Map();
        neighborOffsets.forEach(offset => {
            const offsetX = x + offset[0];
            const offsetY = y + offset[1];
            const offsetZ = z + offset[2];
            const chunkId = world.computeChunkId(offsetX, offsetY, offsetZ);
            if (!updatedChunkIds.get(chunkId)) {
                updatedChunkIds.set(chunkId, true);
                updateChunkGeometry(offsetX, offsetY, offsetZ);
            }
        });
    }
    function updateChunkGeometry(x, y, z) {
        const chunkX = Math.floor(x / CHUNK_SIZE);
        const chunkY = Math.floor(y / CHUNK_SIZE);
        const chunkZ = Math.floor(z / CHUNK_SIZE);
        const chunkId = world.computeChunkId(x, y, z);
        let mesh = chunkIdToMesh.get(chunkId);
        const geometry = mesh ? mesh.geometry : new THREE.BufferGeometry();
    
        const { positions, normals, colors, index } = world.generateGeometryData(chunkX, chunkY, chunkZ);
        const positionNumComponents = 3;
        const normalNumComponents = 3;
        const colorNumComponents = 3;
        geometry.setAttribute(
            'position',
            new THREE.BufferAttribute(new Float32Array(positions), positionNumComponents)
        );
        geometry.setAttribute(
            'normal',
            new THREE.BufferAttribute(new Float32Array(normals), normalNumComponents)
        );
        geometry.setAttribute(
            'color',
            new THREE.BufferAttribute(new Float32Array(colors), colorNumComponents)
        );
        geometry.setIndex(index);
        // position 같은 데이터 수치를 변경했을때는, bounding volumes를 재계산하여
        // raycaster와 voxel helper가 변경된 오브젝트를 인식할 수 있게 함.
        // https://threejs.org/docs/#manual/ko/introduction/How-to-update-things
        geometry.computeBoundingSphere();
    
        if (!mesh) {
            mesh = new THREE.Mesh(geometry, material);
            mesh.name = chunkId;
            chunkIdToMesh.set(chunkId, mesh);
            scene.add(mesh);
            mesh.position.set(chunkX * CHUNK_SIZE, chunkY * CHUNK_SIZE, chunkZ * CHUNK_SIZE);
        }
        /*
        const wireFrame = new THREE.WireframeGeometry(geometry);
        const line = new THREE.LineSegments(wireFrame);
        scene.add(line);
        */
    }
    function getSelectPos(intersect) {
        const selectPos = intersect.point.clone();
        const normal = intersect.face.normal;
        Object.values(normal).forEach((n, idx) => {
            if (n !== 0) {
                const pos = selectPos.getComponent(idx);
                selectPos.setComponent(idx, Math.round(pos));
                selectPos.floor();
                if (n === -1) selectPos.add(normal);
                return;
            }
        });
        return {selectPos, normal};
    }
    function getIntersects() {
        raycaster.setFromCamera(crossHairPos, camera);
        return raycaster.intersectObjects(Array.from(chunkIdToMesh.values()), false);
    }
    function selectVoxel() {
        const intersect = getIntersects();
        if (intersect[0]) {
            const {selectPos, normal} = getSelectPos(intersect[0]);
            voxelHelperMesh.position.copy(selectPos.addScalar(.5).sub(normal));
            scene.add(voxelHelperMesh);
        }
        else {
            scene.remove(voxelHelperMesh);
        }
    }
    function placeVoxel() {
        const intersect = getIntersects();
        if (intersect[0]) {
            const {selectPos, normal} = getSelectPos(intersect[0]);
            if (palette.selected === -1) {
                selectPos.sub(normal);
            }
            world.setVoxel(selectPos.x, selectPos.y, selectPos.z, palette.getSelectedColorCode());
            updateVoxelGeometry(selectPos.x, selectPos.y, selectPos.z);
            console.log(palette.getSelectedColorCode());
        }
    }

    renderer.domElement.addEventListener('click', () => {
        pointerLockControls.lock();
    });
    window.addEventListener('keydown', e => {
        switch(e.code) {
            case 'Digit1':
                palette.select(0);
                break;
            case 'Digit2':
                palette.select(1);
                break;
            case 'Digit3':
                palette.select(2);
                break;
            case 'Digit4':
                palette.select(3);
                break;
            case 'Digit5':
                palette.select(4);
                break;
            case 'Digit6':
                palette.select(5);
                break;
            case 'Digit7':
                palette.select(6);
                break;
            case 'Digit8':
                palette.select(7);
                break;
            case 'KeyX':
                palette.select(-1);
                break;
            default:
                if (!movKey.has(e.code)) return;
                movKey.set(e.code, true);
        }
    });
    window.addEventListener('keyup', e => {
        if (!movKey.has(e.code)) return;
        movKey.set(e.code, false);
    });
    window.addEventListener('resize', () => { 
        const width = window.innerWidth;
        const height = window.innerHeight;
        renderer.setSize(width, height, true);
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
    });

    pointerLockControls.addEventListener('lock', () => {
        window.addEventListener('pointerdown', placeVoxel);
        pointerLockControls.addEventListener('change', selectVoxel);
        palette.colorBoard.style.display = 'none';
    });
    pointerLockControls.addEventListener('unlock', () => {
        window.removeEventListener('pointerdown', placeVoxel);
        pointerLockControls.removeEventListener('change', selectVoxel);
    });

    renderer.setAnimationLoop(() => {
        const delta = clock.getDelta();
        updateControls(delta);
        renderer.render(scene, camera);
    });
    
    // Set World
    const CHUNK_SIZE = 32;
    const world = new World(CHUNK_SIZE);
        
    for (let z = 0; z < CHUNK_SIZE; z++) {
        for (let x = 0; x < CHUNK_SIZE; x++) {
            world.setVoxel(x, 0, z, 36);
        }
    }
    updateChunkGeometry(0, 0, 0);
}
window.onload = onWindowLoaded;