import './text_log.css';

document.body.innerHTML = ''; 

const textWrapper = document.createElement('div');
textWrapper.id = 'text-wrapper';
document.body.append(textWrapper);

// Create and append timer elements
const timerParagraph = document.createElement('p');
timerParagraph.innerHTML = 'Elapsed Time: <span id="timer"></span>';
document.body.appendChild(timerParagraph);

const toggleTimerBtn = document.createElement('button');
toggleTimerBtn.id = 'toggle-timer-btn';
toggleTimerBtn.innerHTML = '<span>Start/Pause Timer</span>';
document.body.appendChild(toggleTimerBtn);

const resetTimerBtn = document.createElement('button');
resetTimerBtn.id = 'reset-timer-btn';
resetTimerBtn.innerHTML = '<span>Reset Timer</span>';
document.body.appendChild(resetTimerBtn);

const charCountParagraph = document.createElement('p');
charCountParagraph.innerHTML = 'Total characters: <span id="char-count"></span>';
document.body.appendChild(charCountParagraph);

(async () => {
    let paragraphArray = await window.electronAPI.getSetting('textLog');
    paragraphArray.forEach(element => {
        const textBox = document.createElement('div');
        textBox.className = 'text-box';
        const paragraph = document.createElement('p');
        paragraph.textContent = element;

        textBox.appendChild(paragraph);
        textWrapper.appendChild(textBox);
    });
    window.scrollTo(0, document.body.scrollHeight);
})();

document.getElementById('toggle-timer-btn').addEventListener('click', () => {
    window.electronAPI.toggleTimer();
});

document.getElementById('reset-timer-btn').addEventListener('click', () => {
    window.electronAPI.resetTimer();
});

// Update timer display
function formatTime(ms) {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

window.electronAPI.onUpdateTimer((time) => {
    // document.getElementById('timer').innerText = Math.floor(time / 1000) + "s";
    document.getElementById('timer').innerText = formatTime(time);
});

// Update character count display
window.electronAPI.onUpdateCharCount((count) => {
    document.getElementById('char-count').innerText = count;
});

// Request initial character count when settings opens
window.electronAPI.requestCharCount();
