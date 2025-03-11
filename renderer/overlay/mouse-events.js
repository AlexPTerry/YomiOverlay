let ignoreMouse = true;

function isTouchableElement(element) {
    return element.classList.contains('touchable') || element.tagName === 'button' || (element.parentElement === document.body && !element.id);
}

function createMouseOverHandler(electronAPI) {
    return (event) => {
        if (isTouchableElement(event.target)) {
            electronAPI.setIgnoreMouseEvents(false);
            ignoreMouse = false;
        }
    };
}

function createMouseOutHandler(electronAPI) {
    return (event) => {
        if (isTouchableElement(event.target)) {
            electronAPI.setIgnoreMouseEvents(true);

            // Purpose of below is to make it possible to move to yomitan window without deselecting elements
            ignoreMouse = true;
            if (window.getSelection) {
                setTimeout(() => {
                    if (ignoreMouse) window.getSelection().removeAllRanges();
                }, 60);
            }
        }
    };
}

export function setupMouseEvents(electronAPI) {
    document.body.addEventListener('mouseover', createMouseOverHandler(electronAPI));
    document.body.addEventListener('mouseout', createMouseOutHandler(electronAPI));
}
