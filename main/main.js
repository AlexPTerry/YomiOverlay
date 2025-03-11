const { app, session, ipcMain, BrowserWindow, screen, globalShortcut } = require("electron");
const { ElectronChromeExtensions } = require("electron-chrome-extensions");
const { keyboard, getWindows, sleep, Key } = require('@nut-tree-fork/nut-js');
const path = require("path");
const koffi = require('koffi');
const { uIOhook, UiohookKey } = require('uiohook-napi');
const fs = require("fs");

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  app.quit();
}

// Possibly use the below instead of nutjs sleep if I never use anything else from it!
// function sleep(ms) {
//   return new Promise(resolve => setTimeout(resolve, ms));
// }


let textLogWindow, overlayWindow, store;
let charCount = 0;
let startTime = Date.now();
let elapsedTime = 0;
let timerRunning = true;
let timerInterval;
let mouseEventsSettable = true;

// let gameHandle = 199270; // <--- Needs to be set non-manually!
let gameHandle = 0;
let partialTitle = 'midori'; // <--- Still needs to be set non-maually but less egregious now
let overlayHandle;
let spaceCounter = 0;

const user32 = koffi.load('user32.dll');
const kernel32 = koffi.load('kernel32.dll');
const GetLastError = kernel32.func('__stdcall', 'GetLastError', 'uint', []);
const PostMessageW = user32.func('__stdcall', 'PostMessageW', 'bool', ['void *', 'uint', 'uintptr_t', 'intptr_t']);
const GetForegroundWindow = user32.func("GetForegroundWindow", "int", []);
const GetWindowTextW = user32.func("GetWindowTextW", "int", ["void *", "char *", "int"]);

const GetClassName = user32.func('__stdcall', 'GetClassNameA', 'int', ['void *', 'char *', 'int']);
const IsWindowVisible = user32.func('__stdcall', 'IsWindowVisible', 'bool', ['void *']);

// Define the callback prototype correctly
const EnumWindowsProc = koffi.proto('__stdcall', 'EnumWindowsProc', 'bool', ['int', 'intptr_t']);
const EnumWindows = user32.func('__stdcall', 'EnumWindows', 'bool', [koffi.pointer(EnumWindowsProc), 'intptr_t']);

// Array to store the window list
let windows = [];

// Register the callback function
const enumWindowsCallback = koffi.register(
    (wHandle, lParam) => {
        let titleBuffer = Buffer.alloc(256);
        let classBuffer = Buffer.alloc(256);

        GetWindowTextW(wHandle, titleBuffer, 256);
        GetClassName(wHandle, classBuffer, 256);

        let title = titleBuffer.toString('ucs2').replace(/\0/g, ''); // Remove null chars
        let className = classBuffer.toString('ucs2').replace(/\0/g, '');
        
        let titleUTF8 = titleBuffer.toString('utf8').replace(/\0/g, ''); // Remove null chars
        let classNameUTF8 = classBuffer.toString('utf8').replace(/\0/g, '');

        if (IsWindowVisible(wHandle) && title.length > 0) {
            windows.push(`${title} | ${className} | ${wHandle}`); // Filter out e.g. file xplorer on class name
            windows.push(`${titleUTF8} | ${classNameUTF8} | ${wHandle}`); 
            if (className.includes(partialTitle) || classNameUTF8.includes(partialTitle)) {
                gameHandle = wHandle;
                return false;
            }
        }

        return true; // Continue enumeration
    },
    koffi.pointer(EnumWindowsProc)
);

// Call EnumWindows
windows = []; // Reset list
EnumWindows(enumWindowsCallback, 0);

// Print results
console.log(windows);
koffi.unregister(enumWindowsCallback);

const WM_KEYDOWN = 0x0100;
const WM_KEYUP = 0x0101;
const VK_SPACE = 0x20;

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


async function loadSettings() {
  let Store = (await import("electron-store")).default;
  store = new Store();

  const { width, height } = screen.getPrimaryDisplay().size;

  let defaultSettings = {
      profile: 'default',
      state: 1,
      fontSize: 1.5,
      lineHeight: 2.1,
      textBox: {
          top: height * 0.7,
          left: width * 0.15,
          width: width * 0.7,
          lines: 3,
      }
  };

  store.set('default', defaultSettings);
  if (!store.get('activeProfile')) store.set('activeProfile', 'default');
  if (!store.get('textLog')) store.set('textLog', []);

  return store.get(store.get('activeProfile'));
}


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
      // if (mouseEventsSettable) {
          console.log('Mouse events are settable: ', mouseEventsSettable);
          overlayWindow.setIgnoreMouseEvents(ignore, { forward: true });
          console.log(`Now ignoring mouse events: ${ignore}`);
      // }
  });

  overlayWindow.webContents.on('before-input-event', async (event, input) => {
      console.log('caught event');
      if (input.key === ' ') {
          event.preventDefault();
          pressSpace();
      }
  });

  overlayWindow.webContents.openDevTools();
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
  ipcMain.handle("get-setting", (event, key) => store.get(key));
  ipcMain.handle("set-setting", (event, key, value) => store.set(key, value));
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
  store.set('textLog', [...store.get('textLog', []), text]);
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

async function pressSpace(params) {
    toggleMouseEventsSettable();
    await sleep(50);
    
    PostMessageW(gameHandle, WM_KEYDOWN, VK_SPACE, 0);
    PostMessageW(gameHandle, WM_KEYUP, VK_SPACE, 0);
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

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.
