const { app, session, ipcMain, BrowserWindow, screen, globalShortcut } = require("electron");
const { ElectronChromeExtensions } = require("electron-chrome-extensions");
const { keyboard, getWindows, sleep, Key } = require('@nut-tree-fork/nut-js');
const path = require("path");
const koffi = require('koffi');
const { uIOhook, UiohookKey } = require('uiohook-napi');

const { getStore, setStore, loadSettings } = require('./modules/settings-handler');
const { GetLastError, PostMessageW, GetForegroundWindow, GetWindowTextW, GetClassName, IsWindowVisible, findWindowHandle, sendWindowSpace} = require("./modules/window-utils");

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
    app.quit();
}

// Possibly use the below instead of nutjs sleep if I never use anything else from it!
// function sleep(ms) {
//   return new Promise(resolve => setTimeout(resolve, ms));
// }

let textLogWindow, overlayWindow;
let charCount = 0;
let startTime = Date.now();
let elapsedTime = 0;
let timerRunning = true;
let timerInterval;
let mouseEventsSettable = true;

let gameHandle = 0;
let partialTitle = 'midori'; // <--- Still needs to be set non-maually but less egregious now
let overlayHandle;
let spaceCounter = 0;

gameHandle = findWindowHandle(partialTitle);


function showHideOverlay() {
    const foregroundHandle = GetForegroundWindow();
    const buffer = Buffer.alloc(256); // Allocate space for title
    const length = GetWindowTextW(foregroundHandle, buffer, buffer.length);
    console.log(`Foreground window: ${buffer.toString("ucs2").slice(0, length)}`);
    
    // Should allow windows such as text log, settings etc. to show overlay
    if (foregroundHandle === gameHandle || foregroundHandle === overlayHandle) {
        console.log('Showing window');
        overlayWindow.show();
    } else {
        console.log('Hiding window');
        overlayWindow.hide();
    }
    // overlayWindow.show();
}

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


async function createOverlayWindow(settings) {
    const { width, height } = screen.getPrimaryDisplay().size;

    overlayWindow = new BrowserWindow({
        width, height,
        frame: false,
        transparent: true,
        resizable: true,
        // focusable: false,
        show: false,
        type: 'toolbar',
        webPreferences: {
            preload: OVERLAY_PRELOAD_WEBPACK_ENTRY,
            nodeIntegration: false,
            contextIsolation: true,
            nativeWindowOpen: true,
            additionalArguments: [JSON.stringify({ settings })]
        },
    });

    overlayWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
    overlayWindow.setAlwaysOnTop(true, "screen-saver", 2);
    overlayWindow.setIgnoreMouseEvents(true, { forward: true });

    ipcMain.on('set-ignore-mouse-events', (event, ignore) => {
        if (mouseEventsSettable) {
            console.log('Mouse events are settable: ', mouseEventsSettable);
            overlayWindow.setIgnoreMouseEvents(ignore, { forward: true });
            console.log(`Now ignoring mouse events: ${ignore}`);
        }
    });

    overlayWindow.webContents.on('before-input-event', async (event, input) => {
        console.log('caught event');
        if (input.key === ' ') {
            event.preventDefault();
            pressSpace();
        }
    });

    // overlayWindow.webContents.openDevTools();
    overlayWindow.loadURL(OVERLAY_WEBPACK_ENTRY);
    overlayHandle = overlayWindow.getNativeWindowHandle().readUInt32LE(0);
    overlayWindow.webContents.once("did-finish-load", showHideOverlay);
    // overlayWindow.webContents.openDevTools();

    return overlayWindow;
}


async function setupChromeExtensions() {
    return new ElectronChromeExtensions({
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
}

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

let clickThrough = false;
function toggleMouseEventsSettable() {
    if (clickThrough) {
        mouseEventsSettable = true;
        console.log('Mouse events are settable: ', mouseEventsSettable);
        overlayWindow.setIgnoreMouseEvents(false, { forward: true });
    } else {
        mouseEventsSettable = false;
        console.log('Mouse events are settable: ', mouseEventsSettable);
        overlayWindow.setIgnoreMouseEvents(true, { forward: true });
    }
    clickThrough = !clickThrough;
}

async function pressSpace() {
    toggleMouseEventsSettable();
    await sleep(50);
    sendWindowSpace(gameHandle);
    await sleep(50); // Have to wait slightly otherwise mouse events kick in before space is propagated

    toggleMouseEventsSettable();
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
        // PostMessageW(135318, WM_KEYDOWN, VK_SPACE, 0);
        // PostMessageW(135318, WM_KEYUP, VK_SPACE, 0);
        // console.log("Success pressing space: ", GetLastError());
        pressSpace();
    });

}

(async function main() {
  await app.whenReady();

//   let settings = await loadSettings();
  let [settings, extensions] = await Promise.all([
      loadSettings(),
      setupChromeExtensions()
  ]);

  // Seems potentially buggy inside electron forge (breaks when I reverse the order in Promise.all())
  // Look here if code breaks!
//   await Promise.all([
//     (async () => {
//         overlayWindow = await createOverlayWindow(settings);
//         extensions.addTab(overlayWindow.webContents, overlayWindow);
//     })(),
//       session.defaultSession.loadExtension(
//           path.join(__dirname, "extensions", "yomitan-chrome"),
//           { allowFileAccess: true }
//       ),
//   ]);

  await session.defaultSession.loadExtension(
    // path.resolve(__dirname, "extensions", "yomitan-chrome"), // No clue why this doesn't work - fs shows directory is there (when not moved by the workaround)
    path.resolve('.', "extensions", "yomitan-chrome"),
    { allowFileAccess: true }
  );

  overlayWindow = await createOverlayWindow(settings);
  extensions.addTab(overlayWindow.webContents, overlayWindow);

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
