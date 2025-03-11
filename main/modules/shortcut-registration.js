const { globalShortcut } = require('electron');

// NEED TO PLUMB IN OTHER MODULES

module.exports.registerGlobalShortcuts = function(overlayWindow, textLogWindow, ) {
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