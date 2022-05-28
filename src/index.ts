import * as THREE from "three";
import Engine from "../Engine";
import PointerControls from "../Engine/controls/PointerControls"
import Palette from './palette';

const CHUNK_SIZE = 32;
const BLOCK_SIZE_BIT = 3;

window.addEventListener('beforeunload', e => {
    e.preventDefault();
    e.returnValue = '';
});
// Define Engine
const engine = new Engine();
engine.tickUpdate = false;

const world = engine.world;
const self = world.self;

// Init self state
self.state.pos[0] = CHUNK_SIZE >> 1;
self.state.pos[1] = 0;
self.state.pos[2] = CHUNK_SIZE >> 1;
self.gravity.isActive = false;

// Define grid helper
const gridHelper = new THREE.GridHelper(CHUNK_SIZE, CHUNK_SIZE);
gridHelper.position.set(CHUNK_SIZE >> 1, 0, CHUNK_SIZE >> 1);
world.add(gridHelper);

// Define voxel helper
const voxelHelperGeometry = new THREE.BoxGeometry(1.001, 1.001, 1.001);
const voxelHelperMaterial = new THREE.MeshBasicMaterial({color: 0xffffff, opacity: 0.5, transparent: true});
const voxelHelperMesh = new THREE.Mesh(voxelHelperGeometry, voxelHelperMaterial);

// Set crosshair & raycaster
const crossHairPos = new THREE.Vector2(0, 0);
const raycaster = new THREE.Raycaster();

window.onload = () => {
    const canvas = document.getElementById('canvas') as HTMLCanvasElement;
    engine.setCanvasToRenderer(canvas); 

    // Define controls
    const controls = new PointerControls(self, canvas, self.peers);
    const moveKey = controls.keys.move;
    const uiKey = controls.keys.ui;
    const movements = controls.movements;
    moveKey.set('KeyW', (isDown: boolean) => movements.set('forward', isDown));
    moveKey.set('ArrowUp', (isDown: boolean) => movements.set('forward', isDown));
    moveKey.set('KeyS', (isDown: boolean) => movements.set('back', isDown));
    moveKey.set('ArrowDown', (isDown: boolean) => movements.set('back', isDown));
    moveKey.set('KeyA', (isDown: boolean) => movements.set('left', isDown));
    moveKey.set('ArrowLeft', (isDown: boolean) => movements.set('left', isDown));
    moveKey.set('KeyD', (isDown: boolean) => movements.set('right', isDown));
    moveKey.set('ArrowRight', (isDown: boolean) => movements.set('right', isDown));
    moveKey.set('Space', (isDown: boolean) => movements.set('top', isDown));
    moveKey.set('ShiftLeft', (isDown: boolean) => movements.set('down', isDown));

    const palette = new Palette(world.data.paletteColors);
    uiKey.set('Digit1', () => palette.select(0));
    uiKey.set('Digit2', () => palette.select(1));
    uiKey.set('Digit3', () => palette.select(2));
    uiKey.set('Digit4', () => palette.select(3));
    uiKey.set('Digit5', () => palette.select(4));
    uiKey.set('Digit6', () => palette.select(5));
    uiKey.set('Digit7', () => palette.select(6));
    uiKey.set('Digit8', () => palette.select(7));
    uiKey.set('KeyX', () => palette.select(-1));

    function getRaycasterIntersect() {
        raycaster.setFromCamera(crossHairPos, self.camera);
        const worldMapMeshs = world.map.meshs;
        const objects = worldMapMeshs.size === 0 ? [gridHelper] : Array.from(worldMapMeshs.values());
        return raycaster.intersectObjects(objects, false)[0];
    }

    function getRaycasterSelectPos(intersect: THREE.Intersection) {
        const selectPos = intersect.point;
        if (world.map.meshs.size === 0) {
            if (palette.isVoxel) {
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
                if (palette.isVoxel) {
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

    function selectVoxel() {
        const intersect = getRaycasterIntersect();
        if (intersect) {
            if (world.map.meshs.size === 0) {
                const {selectPos} = getRaycasterSelectPos(intersect);
                if (palette.isVoxel) {
                    voxelHelperMesh.position.copy(selectPos.addScalar(.5));
                }
                else {
                    voxelHelperMesh.position.copy(selectPos.addScalar(4));
                }
            }
            else {
                const {selectPos, normal} = getRaycasterSelectPos(intersect);
                if (palette.isVoxel) {
                    voxelHelperMesh.position.copy(selectPos.addScalar(.5).sub(normal));
                }
                else {
                    voxelHelperMesh.position.copy(selectPos.addScalar(4).sub(normal));
                }
            }
            world.add(voxelHelperMesh);
        }
        else {
            world.remove(voxelHelperMesh);
        }
    }

    function placeVoxel() {
        const intersect = getRaycasterIntersect();
        if (intersect) {
            const select = getRaycasterSelectPos(intersect);
            if (palette.selected === -1 && world.map.meshs.size !== 0) {
                select.selectPos.sub(select.normal);
            }
            if (palette.isVoxel) {
                world.map.setVoxel(select.selectPos.x, select.selectPos.y, select.selectPos.z, palette.getSelectedColorCode());
            }
            else {
                world.map.setBlock(select.selectPos.x, select.selectPos.y, select.selectPos.z, palette.getSelectedColorCode());
            }
            world.map.updateVoxelGeometry(select.selectPos.x, select.selectPos.y, select.selectPos.z);
        }
    }

    canvas.addEventListener('click', () => {
        controls.lock();
    });

    controls.addEventListener('lock', () => {
        canvas.addEventListener('pointerdown', placeVoxel);
        controls.addEventListener('change', selectVoxel);
        palette.colorBoard.style.display = 'none';
    });
    controls.addEventListener('unlock', () => {
        canvas.removeEventListener('pointerdown', placeVoxel);
        controls.removeEventListener('change', selectVoxel);
    });

    const worldName = document.getElementById('world-name') as HTMLInputElement;
    const save = document.getElementById('save') as HTMLButtonElement;
    const load = document.getElementById('load') as HTMLInputElement;

    worldName.addEventListener('input', () => {
        let maxLength = 32;
        const content = worldName.value;
        for (let i = 0, j = content.length; i < j; i++) {
            if (content.charCodeAt(i) > 255) {
                maxLength = 16;
                break;
            }
        }
        if (content.length > maxLength) {
            worldName.value = content.substr(0, maxLength)
        }
    });

    save.addEventListener('click', () => world.save(worldName.value));
    load.addEventListener('input', () => {
        world.load(load.files[0]).then(() => {
        const spawnPoint = world.data.spawnPoint;
        const selfPos = self.state.pos;
        selfPos[0] = spawnPoint[0];
        selfPos[1] = spawnPoint[1];
        selfPos[2] = spawnPoint[2];
        });
    });

    // Editor
    const setSpawn = document.getElementById('set-spawn') as HTMLButtonElement;
    const goToSpawn = document.getElementById('go-to-spawn') as HTMLButtonElement;
    setSpawn.addEventListener('click', () => {
        if (!confirm('현재 위치를 맵의 스폰 위치로 설정하시겠습니까?')) return;
        const spawnPoint = world.data.spawnPoint;
        const selfPos = self.state.pos;
        spawnPoint[0] = selfPos[0];
        spawnPoint[1] = selfPos[1];
        spawnPoint[2] = selfPos[2];
    });
    goToSpawn.addEventListener('click', () => {
        const spawnPoint = world.data.spawnPoint;
        if (spawnPoint[0] === undefined) {
            alert('스폰 위치가 설정되지 않았습니다!');
            return;
        }
        const selfPos = self.state.pos;
        selfPos[0] = spawnPoint[0];
        selfPos[1] = spawnPoint[1];
        selfPos[2] = spawnPoint[2];
    });

    // Set voxel & block button
    const voxelButton = document.getElementById('voxel') as HTMLButtonElement;
    const blockButton = document.getElementById('block') as HTMLButtonElement;
    voxelButton.addEventListener('click', () => {
        if (palette.isVoxel) return;
        palette.isVoxel = true;
        voxelHelperGeometry.scale(1/8, 1/8, 1/8);
    });
    blockButton.addEventListener('click', () => {
        if (!palette.isVoxel) return;
        palette.isVoxel = false;
        voxelHelperGeometry.scale(8, 8, 8);
    });

    engine.setControls(controls);
    engine.start();
}
