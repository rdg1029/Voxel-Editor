class WorldData {
    constructor() {
        this.buffer = new ArrayBuffer(45);
        this.setData(this.buffer);
    }
    setData(buffer) {
        this.buffer = buffer;
        this.spawnPoint = new Float32Array(this.buffer, 0, 3); // 12 bytes
        this.NAME_CHAR_SIZE = new Uint8Array(this.buffer, 44, 1); // 1 bytes
        if (this.NAME_CHAR_SIZE[0] === 0) {
            this.name = new Uint8Array(this.buffer, 12, 32); // 32 bytes
        }
        else {
            this.name = new Uint16Array(this.buffer, 12, 16);
        }
    }
    getName() {
        let str = '';
        for (let i = 0, j = this.name.length; i < j; i++) {
            if (this.name[i] === 0) break;
            str += String.fromCharCode(this.name[i]);
        }
        return str;
    }
    setName(str) {
        for (let i = 0, j = str.length; i < j; i++) {
            if (str.charCodeAt(i) > 255) {
                this.NAME_CHAR_SIZE[0] = 1;
                this.name = new Uint16Array(this.buffer, 12, 16);
                break;
            }
        }
        for (let i = 0, j = str.length; i < j; i++) {
            this.name[i] = str.charCodeAt(i);
        }
    }
    setSpawnPoint(x, y, z) {
        this.spawnPoint[0] = x;
        this.spawnPoint[1] = y;
        this.spawnPoint[2] = z;
    }
}

const worldData = new WorldData();
export {worldData};