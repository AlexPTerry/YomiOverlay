const { screen, BrowserWindow, ipcMain } = require('electron');

const { findWindowHandle, sendWindowSpace, GetForegroundWindow, GetWindowTextW } = require('./win32-utils');
const { getCurrentSettings } = require('./settings-handler');
const { sleep } = require('./general-utils');

let mouseEventsSettable = true;
let clickThrough = false;
let gameHandle;
let overlayWindow;
let overlayHandle;

async function createOverlayWindow(OVERLAY_PRELOAD_WEBPACK_ENTRY, OVERLAY_WEBPACK_ENTRY) {
    const { width, height } = screen.getPrimaryDisplay().size;
    const overlayWindow = new BrowserWindow({
        width: width,
        height: height,
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
            additionalArguments: [JSON.stringify({settings: getCurrentSettings()})]
        },
    });
    console.log([JSON.stringify(getCurrentSettings())]);
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

    overlayWindow.loadURL(OVERLAY_WEBPACK_ENTRY);
    overlayWindow.webContents.once("did-finish-load", module.exports.showHideOverlay);
    // overlayWindow.webContents.openDevTools();

    // console.log('Overlay window: ', overlayWindow);
    return overlayWindow;
}

module.exports.showHideOverlay = function() {
    const foregroundHandle = GetForegroundWindow();
    const buffer = Buffer.alloc(256); // Allocate space for title
    const length = GetWindowTextW(foregroundHandle, buffer, buffer.length);
    console.log(`Foreground window: ${buffer.toString("ucs2").slice(0, length)}`);
    
    // TODO: Should allow other windows such as text log, settings etc. to show overlay
    if (foregroundHandle === gameHandle || foregroundHandle === overlayHandle) {
        console.log('Showing window');
        overlayWindow.show();
    } else {
        console.log('Hiding window');
        overlayWindow.hide();
    }
    // overlayWindow.show();
}

module.exports.toggleMouseEventsSettable = function() {
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

module.exports.pressSpace = async function() {
    module.exports.toggleMouseEventsSettable();
    await sleep(10);
    sendWindowSpace(gameHandle);
    await sleep(20); // Have to wait slightly otherwise mouse events kick in before space is propagated
    module.exports.toggleMouseEventsSettable();
}

module.exports.getOverlayWindow = function() {
    return overlayWindow;
}

module.exports.getOverlayHandle = function() {
    return overlayHandle;
}

module.exports.getGameHandle = function() {
    return gameHandle;
}

module.exports.initialiseWindows = async function(
    partialTitle,
    OVERLAY_PRELOAD_WEBPACK_ENTRY, 
    OVERLAY_WEBPACK_ENTRY,
    ) {
    gameHandle = findWindowHandle(partialTitle);
    overlayWindow = await createOverlayWindow(OVERLAY_PRELOAD_WEBPACK_ENTRY, OVERLAY_WEBPACK_ENTRY);
    // console.log('Overlay window: ', overlayWindow);
    overlayHandle = overlayWindow.getNativeWindowHandle().readUInt32LE(0);

    return [overlayWindow, overlayHandle, gameHandle];

}