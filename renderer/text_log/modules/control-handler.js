import { appendTextLogEntry } from "./text-log-handler";

function formatTime(ms) {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    // Format HH:MM:SS
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function setupButtonListeners(electronAPI) {
    document.getElementById('toggle-timer-btn').addEventListener('click', () => {
        electronAPI.toggleTimer();
    });
    
    document.getElementById('reset-timer-btn').addEventListener('click', () => {
        electronAPI.resetTimer();
    });
}

function setupUpdateListeners(electronAPI) {
    electronAPI.onUpdateTimer((time) => {
        document.getElementById('timer').innerText = formatTime(time);
    });
    
    electronAPI.onUpdateCharCount((count) => {
        console.log('char count: ', count);
        document.getElementById('char-count').innerText = count;
    });
    
    electronAPI.onUpdateTextLog((text) => {
        appendTextLogEntry(text);
    });
}

export function initialiseControls(electronAPI) {
    setupButtonListeners(electronAPI);
    setupUpdateListeners(electronAPI);

    // Request initial character count when settings opens
    electronAPI.requestCharCount();
    console.log('got here');
}
