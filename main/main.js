const { app, session } = require("electron");
const path = require("path");

const { loadSettings } = require('./modules/settings-handler');
const { setupChromeExtensions } = require('./modules/chrome-extensions');
const { initialiseWindows } = require('./modules/window-handler');
const { initialiseTextLog } = require('./modules/text-log-manager');
const { initialiseUIOHook } = require('./modules/uihook-setup');
const { registerGlobalShortcuts } = require('./modules/shortcut-registration');

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
    app.quit();
}

let partialTitle = 'EnterNameHere'; // <--- Still needs to be set non-manually but less egregious now

(async function main() {
    await app.whenReady();

    await Promise.all([
        loadSettings(),
        setupChromeExtensions()
    ]);

    await session.defaultSession.loadExtension(
        // path.resolve(__dirname, "extensions", "yomitan-chrome"), // No clue why this doesn't work - fs shows directory is there (when not moved by the workaround)
        path.resolve('.', "extensions", "yomitan-chrome"),
        { allowFileAccess: true }
    );

    await initialiseWindows(partialTitle);

    initialiseUIOHook();
    initialiseTextLog();
    registerGlobalShortcuts(app);

})();

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
