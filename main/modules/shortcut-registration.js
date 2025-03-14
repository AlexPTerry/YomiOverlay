const { globalShortcut } = require('electron');

const { getOverlayWindow, showHideTextLog, toggleMouseEventsSettable, pressSpace } = require('./window-handler');

module.exports.registerGlobalShortcuts = async function(app) {
    globalShortcut.register('Alt+O', () => {
        console.log('Alt+O was pressed');
        getOverlayWindow().webContents.send('toggle-styles');
    });
    
    globalShortcut.register('Alt+I', () => {
        console.log('Alt+I was pressed');
        getOverlayWindow().webContents.send('export-settings');
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
            getOverlayWindow().hide();
        } else {
            getOverlayWindow().show();
        }
        overlayShow = !overlayShow;
    });

    globalShortcut.register('Alt+C', () => {
        console.log('Alt+C was pressed');
        toggleMouseEventsSettable();
    });

    globalShortcut.register('Alt+G', () => {
        console.log('Alt+G was pressed');
        getOverlayWindow().setIgnoreMouseEvents(false, { forward: true });
    });
    
    globalShortcut.register('Alt+H', () => {
      console.log('Alt+H was pressed');
      getOverlayWindow().setIgnoreMouseEvents(true, { forward: true });
  });

    globalShortcut.register('Alt+L', () => {
        console.log('Alt+L was pressed');
        pressSpace();
    });
}