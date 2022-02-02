import * as THREE from 'three';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls';
import { World } from './world';
import { Palette } from './palette';

const CHUNK_SIZE = 32;
const BLOCK_SIZE = 8;
const CHUNK_SIZE_BIT = Math.log2(CHUNK_SIZE);
const BLOCK_SIZE_BIT = Math.log2(BLOCK_SIZE);
let isVoxel = true;

function onWindowLoaded() {
    const clock = new THREE.Clock();
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87ceeb);

    const camera = new THREE.PerspectiveCamera(70, window.innerWidth/window.innerHeight, 0.1, 256);
    camera.position.set(CHUNK_SIZE >> 1, 2, CHUNK_SIZE >> 1);

    const renderer = new THREE.WebGLRenderer();
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    const light = new THREE.HemisphereLight(0xffffff, 0xaaaaaa, 1);
    light.position.set(0.5, 1, 0.75);
    scene.add(light);

    const pointerLockControls = new PointerLockControls(camera, document.body);

    // Define grid helper
    const gridHelper = new THREE.GridHelper(CHUNK_SIZE, CHUNK_SIZE);
    gridHelper.position.set(CHUNK_SIZE >> 1, 0, CHUNK_SIZE >> 1);
    scene.add(gridHelper);

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
        const chunkX = x >> CHUNK_SIZE_BIT;
        const chunkY = y >> CHUNK_SIZE_BIT;
        const chunkZ = z >> CHUNK_SIZE_BIT;
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
        // If chunk is empty
        if (index.length === 0) {
            world.chunks.delete(chunkId);
            chunkIdToMesh.delete(chunkId);
            geometry.dispose();
            // If chunk not exist
            if (chunkIdToMesh.size === 0) {
                scene.add(gridHelper);
            }
            else {
                gridHelper.geometry.dispose();
                gridHelper.material.dispose();
                scene.remove(gridHelper);
            }
            return;
        }
        if (!mesh) {
            mesh = new THREE.Mesh(geometry, material);
            mesh.name = chunkId;
            chunkIdToMesh.set(chunkId, mesh);
            scene.add(mesh);
            mesh.position.set(chunkX << CHUNK_SIZE_BIT, chunkY << CHUNK_SIZE_BIT, chunkZ << CHUNK_SIZE_BIT);
        }
    }
    function clearAllChunks() {
        world.chunks.forEach((data, id) => {
            const chunk = chunkIdToMesh.get(id);
            chunk.geometry.dispose();
            scene.remove(chunk);
            chunkIdToMesh.delete(id);
            world.chunks.delete(id);
        });
    }
    function getSelectPos(intersect) {
        const selectPos = intersect.point;
        if (chunkIdToMesh.size === 0) {
            if (isVoxel) {
                // selectPos.floor();
                selectPos.x = selectPos.x << 0;
                selectPos.y = selectPos.y << 0;
                selectPos.z = selectPos.z << 0;
            }
            else {
                selectPos.x = (selectPos.x >> BLOCK_SIZE_BIT) << BLOCK_SIZE_BIT;
                selectPos.y = (selectPos.y >> BLOCK_SIZE_BIT) << BLOCK_SIZE_BIT;
                selectPos.z = (selectPos.z >> BLOCK_SIZE_BIT) << BLOCK_SIZE_BIT;
            }
            return {selectPos};
        }
        const normal = intersect.face.normal;
        Object.values(normal).forEach((n, idx) => {
            if (n !== 0) {
                const pos = selectPos.getComponent(idx);
                selectPos.setComponent(idx, Math.round(pos));
                if (isVoxel) {
                    // selectPos.floor();
                    selectPos.x = selectPos.x << 0;
                    selectPos.y = selectPos.y << 0;
                    selectPos.z = selectPos.z << 0;
                    if (n === -1) selectPos.add(normal);
                }
                else {
                    selectPos.x = (selectPos.x >> BLOCK_SIZE_BIT) << BLOCK_SIZE_BIT;
                    selectPos.y = (selectPos.y >> BLOCK_SIZE_BIT) << BLOCK_SIZE_BIT;
                    selectPos.z = (selectPos.z >> BLOCK_SIZE_BIT) << BLOCK_SIZE_BIT;
                }
                return;
            }
        });
        return {selectPos, normal};
    }
    function getIntersects() {
        raycaster.setFromCamera(crossHairPos, camera);
        const objects = chunkIdToMesh.size === 0 ? [gridHelper] : Array.from(chunkIdToMesh.values());
        return raycaster.intersectObjects(objects, false);
    }
    function selectVoxel() {
        const intersect = getIntersects();
        if (intersect[0]) {
            if (chunkIdToMesh.size === 0) {
                const {selectPos} = getSelectPos(intersect[0]);
                if (isVoxel) {
                    voxelHelperMesh.position.copy(selectPos.addScalar(.5));
                }
                else {
                    voxelHelperMesh.position.copy(selectPos.addScalar(4));
                }
            }
            else {
                const {selectPos, normal} = getSelectPos(intersect[0]);
                if (isVoxel) {
                    voxelHelperMesh.position.copy(selectPos.addScalar(.5).sub(normal));
                }
                else {
                    normal.multiplyScalar(BLOCK_SIZE);
                    voxelHelperMesh.position.copy(selectPos.addScalar(4).sub(normal));
                }
            }
            scene.add(voxelHelperMesh);
        }
        else {
            scene.remove(voxelHelperMesh);
        }
    }
    function placeVoxel() {
        const intersect = getIntersects();
        if (intersect[0]) {
            const select = getSelectPos(intersect[0]);
            if (palette.selected === -1 && chunkIdToMesh.size !== 0) {
                select.selectPos.sub(select.normal);
            }
            world.setVoxel(select.selectPos.x, select.selectPos.y, select.selectPos.z, palette.getSelectedColorCode());
            updateVoxelGeometry(select.selectPos.x, select.selectPos.y, select.selectPos.z);
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
    const world = new World(CHUNK_SIZE);

    // Set save & load button
    const save = document.getElementById('save');
    const load = document.getElementById('load');
    save.addEventListener('click', () => {
        const zip = new JSZip();
        world.chunks.forEach((data, id) => {
            zip.file(id, data);
        });
        zip.generateAsync({type:'blob'})
        .then(content => {
            // const chunkBlob = new Blob([data.buffer], {type:'application/octet-stream'});
            const url = URL.createObjectURL(content);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'test.zip';
            a.click();
            a.remove();
            URL.revokeObjectURL(url);
        });
    });
    load.addEventListener('input', () => {
        const zip = new JSZip();
        zip.loadAsync(load.files[0]).then(() => {
            clearAllChunks();
            zip.forEach((chunk, file) => {
                file.async('uint8array').then(data => {
                    world.chunks.set(chunk, data);
                    const pos = chunk.split(',');
                    const x = Number(pos[0]) << CHUNK_SIZE_BIT;
                    const y = Number(pos[1]) << CHUNK_SIZE_BIT;
                    const z = Number(pos[2]) << CHUNK_SIZE_BIT;
                    updateChunkGeometry(x, y, z);
                });
            });
        });
    });

    // Set voxel & block button
    const voxelButton = document.getElementById('voxel');
    const blockButton = document.getElementById('block');
    voxelButton.addEventListener('click', () => {
        if (isVoxel) return;
        isVoxel = true;
        voxelHelperGeometry.scale(1/8, 1/8, 1/8);
    });
    blockButton.addEventListener('click', () => {
        if (!isVoxel) return;
        isVoxel = false;
        voxelHelperGeometry.scale(8, 8, 8);
    });
}
window.onload = onWindowLoaded;