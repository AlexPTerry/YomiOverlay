const { uIOhook, UiohookKey } = require('uiohook-napi');

const { getOverlayHandle, getGameHandle, showHideOverlay, pressSpace, getTextLogHandle } = require('./window-handler');
const { GetForegroundWindow } = require('./win32-utils');
const { sleep } = require('./general-utils');

function setKeyDownEvents() {
    uIOhook.on('keydown', (e) => {
        console.log('Key: ', e.keycode);
        if (e.keycode === UiohookKey.Q) {
            console.log('Hello!');
        }

        // This might be causing crashes somehow?
        if (e.keycode === UiohookKey.Enter) {
            showHideOverlay();
        }

        if (e.keycode === UiohookKey.Space) {
            // Should this still trigger if the text log is focused? (probably but would need to modify pressSpace)
            // This logic should be moved to window-handler

            const foregroundHandle = GetForegroundWindow();
            console.log('Space pressed');
            if (foregroundHandle === getGameHandle() || foregroundHandle === getOverlayHandle()) {
                console.log('Interacted with window');
                pressSpace();
            }
        }
    });
}

function setKeyUpEvents() {
    uIOhook.on('keyup', (e) => {
        if (e.keycode === UiohookKey.Alt) {
            (async () => {
                await sleep(20);
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