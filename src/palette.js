import { voxelData } from './voxel_data';

class Palette {
    constructor() {
        this.component = document.getElementById('palette');
        this.list = document.getElementsByClassName('palette-list');
        this.colorBoard = document.getElementById('color-board');
        for (let i = 1; i < 65; i++) {
            const color = document.createElement('span');
            color.style.backgroundColor = voxelData[i];
            this.colorBoard.appendChild(color);
            if (i % 8 === 0) {
                this.colorBoard.appendChild(document.createElement('br'));
            }
        }
    }
}

export {Palette};