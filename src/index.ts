import * as THREE from "three";
import Engine from "../Engine";
import PointerControls from "../Engine/controls/PointerControls"
import { Palette } from './palette';

const CHUNK_SIZE = 32;

window.addEventListener('beforeunload', e => {
    e.preventDefault();
    e.returnValue = '';
});
// Define Engine
const engine = new Engine();
engine.tickUpdate = false;

const world = engine.world;
const self = world.self;

// Define self state
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

    const palette = new Palette();
    uiKey.set('Digit1', () => palette.select(0));
    uiKey.set('Digit2', () => palette.select(1));
    uiKey.set('Digit3', () => palette.select(2));
    uiKey.set('Digit4', () => palette.select(3));
    uiKey.set('Digit5', () => palette.select(4));
    uiKey.set('Digit6', () => palette.select(5));
    uiKey.set('Digit7', () => palette.select(6));
    uiKey.set('Digit8', () => palette.select(7));
    uiKey.set('KeyX', () => palette.select(-1));

    canvas.addEventListener('click', () => {
        controls.lock();
    });
    engine.setControls(controls);
    engine.start();
}
