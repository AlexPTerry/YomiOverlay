const { ipcMain } = require('electron');

const { getTextLogWindow } = require('./window-handler');
const { getStore, setStore } = require('./settings-handler');

let charCount = 0;

function setupTimer() {
    let startTime = Date.now();
    let elapsedTime = 0;
    let timerRunning = true;
    let timerInterval;
    
    function startTimer() {
        timerInterval = setInterval(() => {
            elapsedTime = Date.now() - startTime;
            // console.log(textLogWindow);
            let textLogWindow = getTextLogWindow();
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
        module.exports.resetCharCount();
        startTime = Date.now();
        let textLogWindow = getTextLogWindow();
        if (textLogWindow) {
            textLogWindow.webContents.send('update-timer', elapsedTime);
            textLogWindow.webContents.send('update-char-count', module.exports.getCharCount());
        }
    });

    startTimer();
}

// Really need to pin down which functions need to be async...
async function updateTextLog(text) {
    charCount += [...text].length;
    setStore('textLog', [...getStore('textLog', []), text]);
}

function initialiseTextLogIpc() {
    ipcMain.handle("add-text-log", (event, text) => {
        updateTextLog(text);
        getTextLogWindow().webContents.send('update-text-log', text);
        getTextLogWindow().webContents.send('update-char-count', module.exports.getCharCount());
    });
    
    ipcMain.on('request-char-count', (event) => {
        event.reply('update-char-count', module.exports.getCharCount());
    });    
}

module.exports.initialiseTextLog = function() {
    setupTimer();
    initialiseTextLogIpc();
}

module.exports.resetCharCount = function() {
    charCount = 0;
}

module.exports.getCharCount = function() {
    return charCount;
}

module.exports.getTextLog = function() {
    return getStore('textLog', []);
}