let textElement;

export function initialiseTextElement(textWrapper, settings) {
    textElement = document.createElement('span');
    textElement.classList.add('touchable');
    textElement.classList.add(settings.state === 1 ? 'state-1' : 'state-2');
    textWrapper.appendChild(textElement);
    return textElement;
}

export function updateTextContent(sentence) {
    textElement.textContent = sentence;
}

export function setTextState(state) {
    textElement.classList.remove('state-1', 'state-2');
    textElement.classList.add(state === 1 ? 'state-1' : 'state-2');
}