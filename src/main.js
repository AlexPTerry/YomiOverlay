const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('node:path');
const koffi = require('koffi');
const { sleep } = require('@nut-tree-fork/nut-js');
const { uIOhook, UiohookKey } = require('uiohook-napi');

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  app.quit();
}

(async () => {
  await sleep(200);
})();



const user32 = koffi.load('user32.dll');
const kernel32 = koffi.load('kernel32.dll');
const GetLastError = kernel32.func('__stdcall', 'GetLastError', 'uint', []);
const PostMessageW = user32.func('__stdcall', 'PostMessageW', 'bool', ['void *', 'uint', 'uintptr_t', 'intptr_t']);
const GetForegroundWindow = user32.func("GetForegroundWindow", "int", []);
const GetWindowTextW = user32.func("GetWindowTextW", "int", ["void *", "char *", "int"]);

const foregroundHandle = GetForegroundWindow();
const buffer = Buffer.alloc(256); // Allocate space for title
const length = GetWindowTextW(foregroundHandle, buffer, buffer.length);
console.log(`Foreground window: ${buffer.toString("ucs2").slice(0, length)}`);

let mainWindow;
const createWindow = () => {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY,
    },
  });

  // and load the index.html of the app.
  mainWindow.loadURL(MAIN_WINDOW_WEBPACK_ENTRY);

  // Open the DevTools.
  mainWindow.webContents.openDevTools();
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  createWindow();

  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
  (async () => {
    await sleep(100);
  })();
});


uIOhook.on('keydown', (e) => {
  if (e.keycode === UiohookKey.P) {
      console.log('Hi!');
  }
});

uIOhook.start();
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

ipcMain.handle('koffi:config', (e, ...args) => koffi.config(...args));