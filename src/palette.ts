const paletteListData = new Uint8Array([1, 23, 5, 7, 9, 14, 19, 29]);

export default class Palette {
    public selected: number;
    public isVoxel: boolean;
    public list: HTMLCollectionOf<HTMLSpanElement>;
    public eraser: HTMLSpanElement;
    public colorBoard: HTMLDivElement;

    constructor(paletteColors: Array<string>) {
        this.selected = 0;
        this.isVoxel = true;
        this.list = document.getElementsByClassName('palette-list') as HTMLCollectionOf<HTMLSpanElement>;
        this.eraser = document.getElementById('eraser') as HTMLSpanElement;
        this.colorBoard = document.getElementById('color-board') as HTMLDivElement;        
        this.select(this.selected);

        for (let i = 0, j = this.list.length; i < j; i++) {
            this.list[i].style.backgroundColor = paletteColors[paletteListData[i]];
            this.list[i].addEventListener('click', e => {
                this.select(i);
                this.colorBoard.style.display = 'block';
            });
        }

        for (let i = 1; i < 65; i++) {
            const color = document.createElement('span');
            color.style.backgroundColor = paletteColors[i];
            color.addEventListener('click', e => {
                paletteListData[this.selected] = i;
                this.list[this.selected].style.backgroundColor = paletteColors[i];
                this.colorBoard.style.display = 'none';
            });
            this.colorBoard.appendChild(color);
            if (i % 8 === 0) {
                this.colorBoard.appendChild(document.createElement('br'));
            }
        }
    }
    select(index: number) {
        const {list} = this;
        // index : -1 => eraser / 0 ~ 7 -> list
        if (index < -1 || index > 7) {
            console.error('Out of index');
            return;
        }
        if (index === -1) {
            if (this.selected === -1) return;
            this.eraser.style.textShadow = '-1px 0 #ffffffaa, 0 1px #ffffffaa, 1px 0 #ffffffaa, 0 -1px #ffffffaa';
            this.eraser.style.borderColor = '#ffffffaa';
            list[this.selected].style.border = 'none';
        }
        else {
            if (this.selected === -1) {
                this.eraser.style.textShadow = '-1px 0 #000000aa, 0 1px #000000aa, 1px 0 #000000aa, 0 -1px #000000aa';
                this.eraser.style.borderColor = '#000000aa';
            }
            else {
                list[this.selected].style.border = 'none';
            }
            list[index].style.border = 'solid';
        }
        this.selected = index;
    }
    getSelectedColorCode() {
        if (this.selected === -1) return 0;
        return paletteListData[this.selected];
    }
}
