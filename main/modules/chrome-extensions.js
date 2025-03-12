const { BrowserWindow } = require('electron');
const { ElectronChromeExtensions } = require('electron-chrome-extensions');

let extensions;

module.exports.setupChromeExtensions = async function() {
    extensions = new ElectronChromeExtensions({
        license: "GPL-3.0",
        // Seems to work if not included - otherwise needs to be pointed elsewhere to successfully find the preload?
        //   modulePath: path.join(__dirname, 'node_modules', 'electron-chrome-extensions'), 
        createTab(details) {
            const newWin = new BrowserWindow({ alwaysOnTop: true });
            newWin.setAlwaysOnTop(true, "screen-saver");
            if (details.url) newWin.webContents.loadURL(details.url);
            return [newWin.webContents, newWin];
        },
        createWindow(details) {
            const newWin = new BrowserWindow({ alwaysOnTop: true });
            newWin.setAlwaysOnTop(true, "screen-saver");
            if (details.url) newWin.webContents.loadURL(details.url);
            return newWin;
        }
    });
    return extensions;
}

module.exports.addExtensionTab = function(tab, window) {
    extensions.addTab(tab, window);
}