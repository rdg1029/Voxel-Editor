const worldData = {
    buffer: new ArrayBuffer(44),
    name: new Uint16Array(buffer, 0, 16),   // 32 bytes
    spawnPoint: new Float32Array(buffer, 32, 3),   // 12 bytes
};

export {worldData};
