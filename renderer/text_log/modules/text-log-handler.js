const textWrapper = document.getElementById('text-wrapper');

export function appendTextLogEntry(logEntry) {
    const paragraph = document.createElement('p');
    paragraph.textContent = logEntry;

    const textBox = document.createElement('div');
    textBox.className = 'text-box';

    textBox.appendChild(paragraph);
    textWrapper.appendChild(textBox);
    window.scrollTo(0, document.body.scrollHeight); // Scroll to bottom when adding text
}

export function populateTextLog(paragraphArray) {
    paragraphArray.forEach(element => {
        appendTextLogEntry(element);
    });
}