import { voxelData } from './voxel_data';

class Palette {
    constructor() {
        this.component = document.getElementById('palette');
        this.list = [
            document.getElementById('c1'),
            document.getElementById('c2'),
            document.getElementById('c3'),
            document.getElementById('c4'),
            document.getElementById('c5'),
            document.getElementById('c6'),
            document.getElementById('c7'),
            document.getElementById('c8'),
        ];
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