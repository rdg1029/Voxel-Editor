let worldData = {
    spawnPoint: [0, 0, 0],
};

function getWorldData() {
    const dataObj = JSON.stringify(worldData);
    const DATA_LENGTH = dataObj.length;
    const data = new Uint8Array(DATA_LENGTH);
    for (let i = 0, j = DATA_LENGTH; i < j; i++) {
        data[i] = dataObj.charCodeAt(i);
    }
    return data;
}

function setWorldData(uInt8Arr) {
    let data = "";
    for (let i = 0, j = uInt8Arr.length; i < j; i++) {
        data += String.fromCharCode(uInt8Arr[i]);
    }
    console.log(data);
    worldData = JSON.parse(data);
}

export {worldData, getWorldData, setWorldData};