import { contextBridge, ipcRenderer } from 'electron';
import { injectBrowserAction } from 'electron-chrome-extensions/browser-action';
import interact from "interactjs";

injectBrowserAction();


// Retrieve settings from additionalArguments
const args = process.argv.slice(2); // Skip 'electron' and app path
let initialSettings = {};
try {
    const settingsArg = args.find(arg => arg.startsWith('{"settings":'));
    if (settingsArg) {
        initialSettings = JSON.parse(settingsArg).settings;
    }
} catch (error) {
    console.error("Error parsing settings from additionalArguments:", error);
    // Handle error appropriately, maybe use default settings here if parsing fails
}
contextBridge.exposeInMainWorld('initialSettings', initialSettings);
contextBridge.exposeInMainWorld("interact", interact);

contextBridge.exposeInMainWorld('electronAPI', {
    setIgnoreMouseEvents: (ignore) => ipcRenderer.send('set-ignore-mouse-events', ignore),
    getSetting: (key) => ipcRenderer.invoke("get-setting", key),
    setSetting: (key, value) => ipcRenderer.invoke("set-setting", key, value),
    openTextLog: () => ipcRenderer.invoke("open-text-log"),
    addTextLog: (text) => ipcRenderer.invoke("add-text-log", text),
    toggleStyles: (callback) => ipcRenderer.on('toggle-styles', callback),
    exportSettings: (callback) => ipcRenderer.on('export-settings', callback)
});