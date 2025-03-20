const { screen, BrowserWindow, ipcMain } = require('electron');

let findWindowHandle, sendWindowSpace, GetForegroundWindow, GetWindowTextW;
if (process.platform === 'win32') { // Only for windows!
console.log('attempted import');
({ findWindowHandle, findWindowHandleByPid, sendWindowSpace, GetForegroundWindow, GetWindowTextW } = require('./win32-utils'));
}
const { getCurrentSettings } = require('./settings-handler');
const { sleep } = require('./general-utils');
const { addExtensionTab } = require('./chrome-extensions');

let mouseEventsSettable = true;
let clickThrough = false;
let gameHandle;
let overlayWindow;
let overlayHandle;
let textLogWindow;
let textLogHandle;
let textLogShow = false;

async function createOverlayWindow() {
    const { width, height } = screen.getPrimaryDisplay().size;
    overlayWindow = new BrowserWindow({
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

    if (process.platform === 'win32') {
        overlayHandle = overlayWindow.getNativeWindowHandle().readUInt32LE(0);
    }
    
    addExtensionTab(overlayWindow.webContents, overlayWindow);
    // overlayWindow.webContents.openDevTools();

    // console.log('Overlay window: ', overlayWindow);
    return overlayWindow;
}

module.exports.showHideOverlay = function() {
    // Windows only functionality
    if (process.platform === 'win32') {
        const foregroundHandle = GetForegroundWindow();
        const buffer = Buffer.alloc(256); // Allocate space for title
        const length = GetWindowTextW(foregroundHandle, buffer, buffer.length);
        console.log(`Foreground window: ${buffer.toString("ucs2").slice(0, length)}`);
        
        // TODO: Should allow other windows such as text log, settings etc. to show overlay
        if (foregroundHandle === gameHandle || foregroundHandle === overlayHandle || foregroundHandle === textLogHandle) {
            console.log('Showing window');
            overlayWindow.show();
        } else {
            console.log('Hiding window');
            overlayWindow.hide();
        }
    } else {
        overlayWindow.show();
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
    // Windows only functionality
    if (process.platform === 'win32') {
        module.exports.toggleMouseEventsSettable();
        await sleep(10);
        sendWindowSpace(gameHandle);
        await sleep(20); // Have to wait slightly otherwise mouse events kick in before space is propagated
        module.exports.toggleMouseEventsSettable();
    }
}

async function createTextLogWindow() {
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

    if (process.platform === 'win32') {
        textLogHandle = textLogWindow.getNativeWindowHandle().readUInt32LE(0);
    }

    textLogWindow.on('close', (event) => {
        event.preventDefault(); // Prevent the window from closing
        textLogWindow.hide();
        textLogShow = false;
        console.log('Intercepted text log close');
    })
    
    textLogWindow.on('closed', () => {
        textLogWindow = null;
        textLogHandle = null;
        console.log('Closed text log');
    });

    return textLogWindow;
}

module.exports.showHideTextLog = function() {
    if (!textLogWindow) {
        createTextLogWindow();
        textLogWindow.show();
        textLogShow = true;
    } else if (textLogShow) {
        textLogWindow.hide();
        textLogShow = false;
    } else {
        textLogWindow.show();
        textLogShow = true;
    }
}

module.exports.initialiseWindows = async function(partialTitle, pid) {
    if (process.platform === 'win32') {
        console.log('attempted execution');
        if (pid) {
            gameHandle = findWindowHandleByPid(pid);
        } else {
            gameHandle = findWindowHandle(partialTitle);
        }
        console.log(`Game handle; ${gameHandle}`);
    }
    // Why did I even make these async?
    await createOverlayWindow();
    await createTextLogWindow();
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

module.exports.getTextLogWindow = function() {
    return textLogWindow;
}

module.exports.getTextLogHandle = function() {
    return textLogHandle;
}
