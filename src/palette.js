import { voxelData } from './voxel_data';

let selected = 0;
const paletteListData = new Uint8Array([60, 29, 31, 36, 42, 55, 1, 8]);

class Palette {
    constructor() {
        this.list = document.getElementsByClassName('palette-list');
        this.colorBoard = document.getElementById('color-board');        
        this.select(selected);

        for (let i = 1; i < 65; i++) {
            const color = document.createElement('span');
            color.style.backgroundColor = voxelData[i];
            color.addEventListener('click', e => {
                paletteListData[selected] = i;
                this.list[selected].style.backgroundColor = voxelData[i];
                this.colorBoard.style.display = 'none';
                console.log(paletteListData[selected]);
            });
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
        const {list} = this;
        if (index < 0 || index > 7) {
            console.error('Out of index');
            return;
        }
        list[selected].style.border = 'none';
        list[index].style.border = 'solid';
        selected = index;
    }
    getSelectedColorCode() {
        return paletteListData[selected];
    }
}

export {Palette};