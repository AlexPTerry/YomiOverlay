const { app, session, ipcMain, BrowserWindow, screen, globalShortcut } = require("electron");
// const { keyboard, getWindows, sleep, Key } = require('@nut-tree-fork/nut-js');
const path = require("path");

const { getStore, setStore, loadSettings } = require('./modules/settings-handler');
const { setupChromeExtensions, addExtensionTab } = require('./modules/chrome-extensions');
const { initialiseWindows, showHideOverlay, pressSpace, toggleMouseEventsSettable, showHideTextLog, addTextLog, getTextLogWindow, getCharCount, resetCharCount } = require('./modules/window-handler');
const { initialiseUIOHook } = require('./modules/uihook-setup');

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
    app.quit();
}

let overlayWindow, overlayHandle, gameHandle, textLogWindow, textLogHandle;
let startTime = Date.now();
let elapsedTime = 0;
let timerRunning = true;
let timerInterval;

let partialTitle = 'midori'; // <--- Still needs to be set non-manually but less egregious now


function setupTimer() {
    function startTimer() {
        timerInterval = setInterval(() => {
            elapsedTime = Date.now() - startTime;
            // console.log(textLogWindow);
            let textLogWindow = getTextLogWindow();
            if (textLogWindow) {
                textLogWindow.webContents.send('update-timer', elapsedTime);
            }
        }, 1000);
    }

    ipcMain.on('toggle-timer', () => {
        timerRunning = !timerRunning;
        if (timerRunning) {
            startTime = Date.now() - elapsedTime;
            startTimer();
        } else {
            clearInterval(timerInterval);
        }
    });

    ipcMain.on('reset-timer', () => {
        elapsedTime = 0;
        resetCharCount();
        startTime = Date.now();
        let textLogWindow = getTextLogWindow();
        if (textLogWindow) {
            textLogWindow.webContents.send('update-timer', elapsedTime);
            textLogWindow.webContents.send('update-char-count', getCharCount());
        }
    });

    startTimer();
}

function registerIpcHandlers() {
    ipcMain.handle("get-setting", (event, key) => getStore(key));
    ipcMain.handle("set-setting", (event, key, value) => setStore(key, value));
    ipcMain.handle("add-text-log", (event, text) => {
        addTextLog(text);
        getTextLogWindow().webContents.send('update-text-log', text);
        getTextLogWindow().webContents.send('update-char-count', getCharCount());
    });
    ipcMain.on('request-char-count', (event) => {
        event.reply('update-char-count', getCharCount());
    });
}

async function registerGlobalShortcuts() {
    globalShortcut.register('Alt+O', () => {
        console.log('Alt+O was pressed');
        overlayWindow.webContents.send('toggle-styles');
    });
    
    globalShortcut.register('Alt+I', () => {
        console.log('Alt+I was pressed');
        overlayWindow.webContents.send('export-settings');
    });
    
    globalShortcut.register('Alt+T', () => {
        console.log('Alt+T was pressed');
        showHideTextLog();
    });
    
    globalShortcut.register('Alt+W', () => {
        console.log('Alt+W was pressed');
        app.quit(); 
    });
    
    let overlayShow = true;
    globalShortcut.register('Alt+S', () => {
        console.log('Alt+S was pressed');
        if (overlayShow) {
            overlayWindow.hide();
        } else {
            overlayWindow.show();
        }
        overlayShow = !overlayShow;
    });

    globalShortcut.register('Alt+C', () => {
        console.log('Alt+C was pressed');
        toggleMouseEventsSettable();
    });

    globalShortcut.register('Alt+G', () => {
        console.log('Alt+G was pressed');
        overlayWindow.setIgnoreMouseEvents(false, { forward: true });
    });
    
    globalShortcut.register('Alt+H', () => {
      console.log('Alt+H was pressed');
      overlayWindow.setIgnoreMouseEvents(true, { forward: true });
  });

    globalShortcut.register('Alt+L', () => {
        console.log('Alt+L was pressed');
        pressSpace();
    });

}

(async function main() {
    await app.whenReady();

    let [settings, _] = await Promise.all([
        loadSettings(),
        setupChromeExtensions()
    ]);

    await session.defaultSession.loadExtension(
        // path.resolve(__dirname, "extensions", "yomitan-chrome"), // No clue why this doesn't work - fs shows directory is there (when not moved by the workaround)
        path.resolve('.', "extensions", "yomitan-chrome"),
        { allowFileAccess: true }
    );

    [overlayWindow, overlayHandle, gameHandle, textLogWindow, textLogHandle] = await initialiseWindows(
        partialTitle, 
        // OVERLAY_PRELOAD_WEBPACK_ENTRY, 
        // OVERLAY_WEBPACK_ENTRY,
        // TEXT_LOG_PRELOAD_WEBPACK_ENTRY,
        // TEXT_LOG_WEBPACK_ENTRY
    );
    
    addExtensionTab(overlayWindow.webContents, overlayWindow);

    initialiseUIOHook();
    registerIpcHandlers();
    registerGlobalShortcuts();
    setupTimer();

})();

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
