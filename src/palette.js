import { voxelData } from './voxel_data';

class Palette {
    constructor() {
        this.selected = 0;
        this.component = document.getElementById('palette');
        this.list = document.getElementsByClassName('palette-list');
        this.colorBoard = document.getElementById('color-board');
        this.select(this.selected);

        for (let i = 1; i < 65; i++) {
            const color = document.createElement('span');
            color.style.backgroundColor = voxelData[i];
            this.colorBoard.appendChild(color);
            if (i % 8 === 0) {
                this.colorBoard.appendChild(document.createElement('br'));
            }
        }
        for (let i = 0, j = this.list.length; i < j; i++) {
            this.list[i].addEventListener('click', e => {
                this.select(i);
                this.colorBoard.style.display = 'block';
            });
        }
    }
    select(index) {
        this.list[this.selected].style.border = 'none';
        this.list[index].style.border = 'solid';
        this.selected = index;
    }
}

export {Palette};