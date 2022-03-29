import * as THREE from 'three';
// import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls';
import { PointerLockControls } from './PointerLockControls';
import { World } from './world';
import { Palette } from './palette';
import { worldData, getWorldData, setWorldData } from './world_data';
import { CameraHelper } from 'three';

const CHUNK_SIZE = 32;
const BLOCK_SIZE = 8;
const CHUNK_SIZE_BIT = Math.log2(CHUNK_SIZE);
const BLOCK_SIZE_BIT = Math.log2(BLOCK_SIZE);

const EPSILON = 0.001;

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

    function updateControls(speed) {
        pointerLockControls.direction.copy(camera.position);
        if (movKey.get('KeyW')) {
            pointerLockControls.moveForward(speed);
        }
        if (movKey.get('KeyS')) {
            pointerLockControls.moveForward(-speed);
        }
        if (movKey.get('KeyA')) {
            pointerLockControls.moveRight(-speed);
        }
        if (movKey.get('KeyD')) {
            pointerLockControls.moveRight(speed);
        }
        if (movKey.get('Space')) {
            pointerLockControls.direction.y += speed;
        }
        if (movKey.get('ShiftLeft')) {
            pointerLockControls.direction.y -= speed;
        }
        return pointerLockControls.direction;
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
                selectPos.floor();
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
                    selectPos.floor();
                }
                else {
                    selectPos.x = (selectPos.x >> BLOCK_SIZE_BIT) << BLOCK_SIZE_BIT;
                    selectPos.y = (selectPos.y >> BLOCK_SIZE_BIT) << BLOCK_SIZE_BIT;
                    selectPos.z = (selectPos.z >> BLOCK_SIZE_BIT) << BLOCK_SIZE_BIT;
                    normal.setComponent(idx, n << BLOCK_SIZE_BIT);
                }
                if (n < 0) selectPos.add(normal);
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
            if (isVoxel) {
                world.setVoxel(select.selectPos.x, select.selectPos.y, select.selectPos.z, palette.getSelectedColorCode());
            }
            else {
                world.setBlock(select.selectPos.x, select.selectPos.y, select.selectPos.z, palette.getSelectedColorCode());
            }
            updateVoxelGeometry(select.selectPos.x, select.selectPos.y, select.selectPos.z);
        }
    }

    renderer.domElement.addEventListener('click', () => {
        pointerLockControls.lock();
    });

    //Collision
    const box = new THREE.Box3();
    const boxHelper = new THREE.Box3Helper(box);
    scene.add(boxHelper);
    const boxSize = new THREE.Vector3(4, 14, 4);

    function updateBox() {
        const boxCenter = camera.position.clone();
        boxCenter.y -= 6;
        box.setFromCenterAndSize(boxCenter, boxSize);
    }
    function sweptAABB(voxelX, voxelY, voxelZ, velocity) {
        const normal = new Int8Array(3);
        const xInvEntry = velocity.x > 0 ? voxelX - box.max.x : (voxelX + 1) - box.min.x;
        const xInvExit = velocity.x > 0 ? (voxelX + 1) - box.min.x : voxelX - box.max.x;
        const yInvEntry = velocity.y > 0 ? voxelY - box.max.y : (voxelY + 1) - box.min.y;
        const yInvExit = velocity.y > 0 ? (voxelY + 1) - box.min.y : voxelY - box.max.y;
        const zInvEntry = velocity.z > 0 ? voxelZ - box.max.z : (voxelZ + 1) - box.min.z;
        const zInvExit = velocity.z > 0 ? (voxelZ + 1) - box.min.z : voxelZ - box.max.z;

        const xEntry = velocity.x === 0 ? -Infinity : xInvEntry / velocity.x;
        const xExit = velocity.x === 0 ? Infinity : xInvExit / velocity.x;
        const yEntry = velocity.y === 0 ? -Infinity : yInvEntry / velocity.y;
        const yExit = velocity.y === 0 ? Infinity : yInvExit / velocity.y;
        const zEntry = velocity.z === 0 ? -Infinity : zInvEntry / velocity.z;
        const zExit = velocity.z === 0 ? Infinity : zInvExit / velocity.z;

        const entryTime = Math.max(xEntry, yEntry, zEntry);
        const exitTime = Math.min(xExit, yExit, zExit);
        //if no collision
        if (entryTime > exitTime || entryTime < 0) {
            const NO_COLLISION = 1;
            return {NO_COLLISION, normal};
        }
        else {
            normal[0] = entryTime === xEntry ? -Math.sign(velocity.x) : 0;
            normal[1] = entryTime === yEntry ? -Math.sign(velocity.y) : 0;
            normal[2] = entryTime === zEntry ? -Math.sign(velocity.z) : 0;
            return {entryTime, normal};
        }
    }
    function detectCollision(dir) {
        const velocity = dir.clone().sub(camera.position);
        const displacement = velocity.clone();
        let collisionTime = 1;
        updateBox();

        for (let i = 0; i < 3; i++) {
            collisionTime = 1;
            let collNormal = new Int8Array(3);
            const minX = Math.floor(box.min.x + velocity.x);
            const maxX = Math.ceil(box.max.x + velocity.x);
            const minY = Math.floor(box.min.y + velocity.y);
            const maxY = Math.ceil(box.max.y + velocity.y);
            const minZ = Math.floor(box.min.z + velocity.z);
            const maxZ = Math.ceil(box.max.z + velocity.z);
            for (let y = minY; y < maxY; y++) {
                for (let x = minX; x < maxX; x++) {
                    for (let z = minZ; z < maxZ; z++) {
                        if (world.getVoxel(x, y, z) === 0) continue;
                        const {entryTime, normal} = sweptAABB(x, y, z, velocity);
                        if (entryTime === 1) continue;
                        if (entryTime < collisionTime) {
                            collisionTime = entryTime;
                            collNormal = normal;
                        } 
                    }
                }
            }
            if (collisionTime === 1) break;
            collisionTime -= EPSILON;
            if (collNormal[0] !== 0) {
                velocity.x = 0;
                displacement.x *= collisionTime;
                continue;
            }
            if (collNormal[1] !== 0) {
                velocity.y = 0;
                displacement.y *= collisionTime;
                continue;
            }
            if (collNormal[2] !== 0) {
                velocity.z = 0;
                displacement.z *= collisionTime;
            }
        }
        camera.position.add(displacement);
        updateBox();
    }
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
        const speed = clock.getDelta() * 16;
        const dir = updateControls(speed);
        detectCollision(dir);
        renderer.render(scene, camera);
    });
    
    // Set World
    const world = new World(CHUNK_SIZE);

    // Set save & load button
    const worldName = document.getElementById('world-name');
    const save = document.getElementById('save');
    const load = document.getElementById('load');
    worldName.addEventListener('input', e => {
        let maxLength = 32;
        const content = e.target.value;
        for (let i = 0, j = content.length; i < j; i++) {
            if (content.charCodeAt(i) > 255) {
                maxLength = 16;
                break;
            }
        }
        if (content.length > maxLength) {
            e.target.value = content.substr(0, maxLength)
        }
    });
    save.addEventListener('click', () => {
        if (worldData.spawnPoint[0] === undefined) {
            alert('맵의 스폰 위치를 설정해주세요!');
            return;
        }
        if (worldName.value.length === 0) return;
        const data = getWorldData();
        const zip = new JSZip();
        zip.file('data', data);
        world.chunks.forEach((data, id) => {
            zip.file(`chunks/${id}`, data);
        });
        zip.generateAsync({type:'blob'})
        .then(content => {
            // const chunkBlob = new Blob([data.buffer], {type:'application/octet-stream'});
            const url = URL.createObjectURL(content);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${worldName.value}.zip`;
            a.click();
            a.remove();
            URL.revokeObjectURL(url);
        });
    });
    load.addEventListener('input', () => {
        const zip = new JSZip();
        zip.loadAsync(load.files[0]).then(() => {
            clearAllChunks();
            const dataFile = zip.file('data');
            if (dataFile) {
                dataFile.async('uint8array').then(data => {
                    setWorldData(data);
                    const spawnPoint = worldData.spawnPoint;
                    camera.position.set(spawnPoint[0], spawnPoint[1] + 13, spawnPoint[2]);
                });
            }
            zip.folder('chunks').forEach((chunk, file) => {
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

    // Editor
    const setSpawn = document.getElementById('set-spawn');
    const goToSpawn = document.getElementById('go-to-spawn');
    setSpawn.addEventListener('click', () => {
        if (!confirm('현재 위치를 맵의 스폰 위치로 설정하시겠습니까?')) return;
        worldData.spawnPoint[0] = camera.position.x;
        worldData.spawnPoint[1] = box.min.y;
        worldData.spawnPoint[2] = camera.position.z;
    });
    goToSpawn.addEventListener('click', () => {
        if (worldData.spawnPoint[0] === undefined) {
            alert('스폰 위치가 설정되지 않았습니다!');
            return;
        }
        const spawnPoint = worldData.spawnPoint;
        camera.position.set(spawnPoint[0], spawnPoint[1] + 13, spawnPoint[2]);
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
