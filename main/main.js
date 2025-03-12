const { app, session, ipcMain, BrowserWindow, screen, globalShortcut } = require("electron");
// const { keyboard, getWindows, sleep, Key } = require('@nut-tree-fork/nut-js');
const path = require("path");
const { uIOhook, UiohookKey } = require('uiohook-napi');

const { getStore, setStore, loadSettings } = require('./modules/settings-handler');
const { GetLastError, PostMessageW, GetForegroundWindow, GetWindowTextW, GetClassName, IsWindowVisible, findWindowHandle, sendWindowSpace} = require("./modules/win32-utils");
const { setupChromeExtensions, addExtensionTab } = require('./modules/chrome-extensions');
const { initialiseWindows, showHideOverlay, pressSpace, toggleMouseEventsSettable } = require('./modules/window-handler');
const { sleep } = require('./modules/general-utils');

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
    app.quit();
}

let textLogWindow, overlayWindow;
let charCount = 0;
let startTime = Date.now();
let elapsedTime = 0;
let timerRunning = true;
let timerInterval;
// let mouseEventsSettable = true;

let gameHandle = 0;
let partialTitle = 'midori'; // <--- Still needs to be set non-manually but less egregious now
let overlayHandle;
let spaceCounter = 0;



uIOhook.on('keydown', (e) => {
    if (e.keycode === UiohookKey.Q) {
        console.log('Hello!');
    }

    // This might be causing crashes somehow?
    if (e.keycode === UiohookKey.Enter) {
        showHideOverlay();
    }

    if (e.keycode === UiohookKey.Space) {
        // Should check here that either the overlay, target program (+maybe text log) are in focus
        spaceCounter += 1; // (bug checking)
        console.log(spaceCounter);

        const foregroundHandle = GetForegroundWindow();
        if (foregroundHandle === gameHandle || foregroundHandle === overlayHandle) {
            pressSpace();
            console.log('Pressed space');
        }
    }
})

uIOhook.on('keyup', (e) => {
    if (e.keycode === UiohookKey.Alt) {
        (async () => {
            await sleep(20);
            showHideOverlay();
        })();
    }
})

uIOhook.on('mouseup', (e) => {
    (async () => {
        await sleep(20);
        showHideOverlay();
    })();
})

uIOhook.start()


function setupTimer() {
    function startTimer() {
        timerInterval = setInterval(() => {
            elapsedTime = Date.now() - startTime;
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
        startTime = Date.now();
        if (textLogWindow) {
            textLogWindow.webContents.send('update-timer', elapsedTime);
        }
    });

    startTimer();
}

function registerIpcHandlers() {
    ipcMain.handle("get-setting", (event, key) => getStore(key));
    ipcMain.handle("set-setting", (event, key, value) => setStore(key, value));
    ipcMain.handle("open-text-log", () => openTextLog());
    ipcMain.handle("add-text-log", (event, text) => addTextLog(text));
    ipcMain.on('request-char-count', (event) => event.reply('update-char-count', charCount));
}

async function openTextLog() {
    const { width, height } = screen.getPrimaryDisplay().size;

    textLogWindow = new BrowserWindow({
            width: width / 2,
            height: height / 2,
            resizable: true,
            show: false,
            parent: overlayWindow,
            webPreferences: {
                preload: TEXT_LOG_PRELOAD_WEBPACK_ENTRY,
                nodeIntegration: false,
                contextIsolation: true,
                nativeWindowOpen: true,
        },
    });

    textLogWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
    textLogWindow.setAlwaysOnTop(true, "screen-saver", 2);
    textLogWindow.loadURL(TEXT_LOG_WEBPACK_ENTRY);
    // textLogWindow.openDevTools();

    textLogWindow.once('ready-to-show', () => textLogWindow.show());
    textLogWindow.on('closed', () => textLogWindow = null);
}

async function addTextLog(text) {
    charCount += [...text].length;
    setStore('textLog', [...getStore('textLog', []), text]);
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
    
    let textLogShow = false;
    globalShortcut.register('Alt+T', () => {
        console.log('Alt+T was pressed');
        if (!textLogWindow) {
            openTextLog();
            textLogShow = true;
        } else if (textLogShow) {
            textLogWindow.hide();
            textLogShow = false;
        } else {
            textLogWindow.show();
            textLogShow = true;
        }
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

    [overlayWindow, overlayHandle, gameHandle] = await initialiseWindows(
        partialTitle, 
        OVERLAY_PRELOAD_WEBPACK_ENTRY, 
        OVERLAY_WEBPACK_ENTRY
    );
    
    addExtensionTab(overlayWindow.webContents, overlayWindow);

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
