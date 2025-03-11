
export function createOverlayElements() {
    const websiteContainerWrapper = document.createElement('div');
    websiteContainerWrapper.id = 'website-container-wrapper';

    const browserActionList = document.createElement('browser-action-list');
    browserActionList.classList.add('touchable', 'hideable');

    const textWrapper = document.createElement('div');
    textWrapper.id = 'text-wrapper';
    textWrapper.classList.add('touchable', 'hideable');

    const fontSizeAdjuster = document.createElement('div');
    fontSizeAdjuster.id = 'font-size-adjuster';
    fontSizeAdjuster.classList.add('touchable', 'hideable');

    const lineHeightAdjuster = document.createElement('div');
    lineHeightAdjuster.id = 'line-height-adjuster';
    lineHeightAdjuster.classList.add('touchable', 'hideable');

    websiteContainerWrapper.appendChild(textWrapper);
    websiteContainerWrapper.appendChild(browserActionList);
    websiteContainerWrapper.appendChild(fontSizeAdjuster);
    websiteContainerWrapper.appendChild(lineHeightAdjuster);

    return { websiteContainerWrapper, textWrapper, browserActionList, fontSizeAdjuster, lineHeightAdjuster };
}

export function appendElementsToBody(websiteContainerWrapper) {
    document.body.innerHTML = ''; 
    document.body.appendChild(websiteContainerWrapper);
}

export function updateCSSVariable(variableName, value) {
    document.body.style.setProperty(variableName, value);
}

export function setInitialCSSVariables(settings) {
    updateCSSVariable("--font-size", `${settings.fontSize}rem`);
    updateCSSVariable("--line-height", `${settings.lineHeight}rem`);
    updateCSSVariable("--text-box-height", `${settings.textBox.height}px`);
    updateCSSVariable("--text-box-top", `${settings.textBox.top}px`);
    updateCSSVariable("--text-box-left", `${settings.textBox.left}px`);
    updateCSSVariable("--text-box-width", `${settings.textBox.width}px`);

    if (settings.state === 1) {
        updateCSSVariable('--visibility', 'visible');
        updateCSSVariable('--pointer-events', 'auto');
    } else {
        updateCSSVariable('--visibility', 'hidden');
        updateCSSVariable('--pointer-events', 'none');
    }
}
