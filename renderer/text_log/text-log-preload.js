const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    getSetting: (key) => ipcRenderer.invoke("get-setting", key),
    setSetting: (key, value) => ipcRenderer.invoke("set-setting", key, value),
    // openTextLog: () => ipcRenderer.invoke("open-text-log"),
    toggleTimer: () => ipcRenderer.send('toggle-timer'),
    resetTimer: () => ipcRenderer.send('reset-timer'),
    requestCharCount: () => ipcRenderer.send('request-char-count'),
    onUpdateTimer: (callback) => ipcRenderer.on('update-timer', (event, time) => callback(time)),
    onUpdateCharCount: (callback) => ipcRenderer.on('update-char-count', (event, count) => callback(count)),
    onUpdateTextLog: (callback) => ipcRenderer.on('update-text-log', (event, count) => callback(count)),
});
