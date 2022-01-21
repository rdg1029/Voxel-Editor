import * as THREE from 'three';
import { voxelData, getRGB } from './voxel_data';

class World {
    constructor(chunkSize) {
        this.chunkSize = chunkSize;
        this.chunkSliceSize = chunkSize * chunkSize;
        // this.chunk = new Uint8Array(chunkSize * chunkSize * chunkSize);
        this.chunks = new Map();
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
        return this.chunks.get(this.computeChunkId(x, y, z));
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
        let chunk = this.chunks.get(chunkId);
        if (!chunk) {
            const { chunkSize } = this;
            chunk = new Uint8Array(chunkSize * chunkSize * chunkSize);
            this.chunks.set(chunkId, chunk);
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

export {World};