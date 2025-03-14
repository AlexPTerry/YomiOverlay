const { uIOhook, UiohookKey } = require('uiohook-napi');

const { getOverlayHandle, getGameHandle, showHideOverlay, pressSpace, getTextLogHandle } = require('./window-handler');
const { GetForegroundWindow } = require('./win32-utils');
const { sleep } = require('./general-utils');

function setKeyDownEvents() {
    uIOhook.on('keydown', (e) => {
        // This might be causing crashes somehow?
        if (e.keycode === UiohookKey.Enter) {
            showHideOverlay();
        }

        if (e.keycode === UiohookKey.Space) {
            // Should this still trigger if the text log is focused? (probably but would need to modify pressSpace)
            // This logic should be moved to window-handler

            const foregroundHandle = GetForegroundWindow();
            if (foregroundHandle === getGameHandle() || foregroundHandle === getOverlayHandle()) {
                console.log('Pressed space on overlay/window');
                pressSpace();
            }
        }
    });
}

function setKeyUpEvents() {
    uIOhook.on('keyup', (e) => {
        if (e.keycode === UiohookKey.Alt) {
            (async () => {
                await sleep(20); // Takes a (50th of a) sec for the foreground window to change
                showHideOverlay();
            })();
        }
    });
}

function setMouseUpEvents() {
    uIOhook.on('mouseup', (e) => {
        (async () => {
            await sleep(20);
            showHideOverlay();
        })();
    });
}

module.exports.initialiseUIOHook = function() {
    setKeyDownEvents();
    setKeyUpEvents();
    setMouseUpEvents();
    uIOhook.start();
}