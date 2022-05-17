import * as THREE from "three";
import Engine from "../Engine";

const CHUNK_SIZE = 32;

window.addEventListener('beforeunload', e => {
    e.preventDefault();
    e.returnValue = '';
});

window.onload = () => {
    // Define Engine
    const engine = new Engine();
    const canvas = document.getElementById('canvas') as HTMLCanvasElement;
    engine.setCanvasToRenderer(canvas);

    const controls = engine.controls;
    const world = engine.world;

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

    engine.start();
}
