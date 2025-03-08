const { app, session, ipcMain, BrowserWindow, screen, globalShortcut } = require("electron");
const { ElectronChromeExtensions } = require("electron-chrome-extensions");
// const { keyboard, getWindows, sleep, Key } = require('@nut-tree-fork/nut-js');
const path = require("path");
const koffi = require('koffi');
// const { uIOhook, UiohookKey } = require('uiohook-napi');

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  app.quit();
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}


let textLogWindow, overlayWindow, store;
let charCount = 0;
let startTime = Date.now();
let elapsedTime = 0;
let timerRunning = true;
let timerInterval;
let mouseEventsSettable = true;

let gameHandle = 199270; // <--- Needs to be set non-manually!
let overlayHandle;
let spaceCounter = 0;

const user32 = koffi.load('user32.dll');
const kernel32 = koffi.load('kernel32.dll');
const GetLastError = kernel32.func('__stdcall', 'GetLastError', 'uint', []);
const PostMessageW = user32.func('__stdcall', 'PostMessageW', 'bool', ['void *', 'uint', 'uintptr_t', 'intptr_t']);
const GetForegroundWindow = user32.func("GetForegroundWindow", "int", []);
const GetWindowTextW = user32.func("GetWindowTextW", "int", ["void *", "char *", "int"]);

const WM_KEYDOWN = 0x0100;
const WM_KEYUP = 0x0101;
const VK_SPACE = 0x20;

function showHideOverlay() {
  const foregroundHandle = GetForegroundWindow();
  const buffer = Buffer.alloc(256); // Allocate space for title
  const length = GetWindowTextW(foregroundHandle, buffer, buffer.length);
  console.log(`Foreground window: ${buffer.toString("ucs2").slice(0, length)}`);
  
  if (foregroundHandle === gameHandle || foregroundHandle === overlayHandle) {
      console.log('Showing window');
      overlayWindow.show();
  } else {
      console.log('Hiding window');
      overlayWindow.hide();
  }
}

// uIOhook.on('keydown', (e) => {
//   if (e.keycode === UiohookKey.Q) {
//       console.log('Hello!');
//   }

//   if (e.keycode === UiohookKey.Enter) {
//       showHideOverlay();

//   }

//   if (e.keycode === UiohookKey.Space) {
//       // Should check here that either the overlay, target program (+maybe text log) are in focus
//       spaceCounter += 1; // (bug checking)
//       console.log(spaceCounter);

//       const foregroundHandle = GetForegroundWindow();
//       if (foregroundHandle === gameHandle || foregroundHandle === overlayHandle) {
//           pressSpace();
//       }
//   }
// })

// uIOhook.on('keyup', (e) => {
//   if (e.keycode === UiohookKey.Alt) {
//       (async () => {
//           await sleep(20);
//           showHideOverlay();
//       })();
//   }
// })

// uIOhook.on('mouseup', (e) => {
//   (async () => {
//       await sleep(20);
//       showHideOverlay();
//   })();
// })

// uIOhook.start()


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
      if (mouseEventsSettable) {
          console.log('Mouse events are settable: ', mouseEventsSettable);
          overlayWindow.setIgnoreMouseEvents(ignore, { forward: true });
          console.log(`Now ignoring mouse events: ${ignore}`);
      }
  });

  // overlayWindow.webContents.on('before-input-event', async (event, input) => {
  //     console.log('caught event');
  //     if (input.key === ' ') {
  //         event.preventDefault();
  //         pressSpace();
  //     }
  // });

  overlayWindow.loadURL(OVERLAY_WEBPACK_ENTRY);
  overlayHandle = overlayWindow.getNativeWindowHandle().readUInt32LE(0);
  overlayWindow.webContents.once("did-finish-load", showHideOverlay);
  // overlayWindow.webContents.openDevTools();

  return overlayWindow;
}


async function setupChromeExtensions() {
  return new ElectronChromeExtensions({
      license: "GPL-3.0",
      modulePath: path.join(__dirname, 'node_modules', 'electron-chrome-extensions'),
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

(async function main() {
  await app.whenReady();


  let [settings, extensions] = await Promise.all([
      loadSettings(),
      setupChromeExtensions()
  ]);

  await Promise.all([
      session.defaultSession.loadExtension(
          path.join(__dirname, "extensions", "yomitan-chrome"),
          { allowFileAccess: true }
      ),
      (async () => {
          overlayWindow = await createOverlayWindow(settings);
          extensions.addTab(overlayWindow.webContents, overlayWindow);
      })()
  ]);

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
