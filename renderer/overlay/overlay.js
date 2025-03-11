import './overlay.css';

import { createOverlayElements, appendElementsToBody, setInitialCSSVariables } from './modules/dom-elements';
import { setupMouseEvents } from './modules/mouse-events';
import { initialiseTextElement, updateTextContent, setTextState } from './modules/text-handler';
import { setupWebSocket } from './modules/websocket-service';
import { setupInteractJS } from './modules/interact-setup';
import { initialiseSettings, toggleStyles, exportSettings } from './modules/settings-handler';

let settings = initialiseSettings(window.initialSettings); // initialSettings comes from preload script

const { websiteContainerWrapper, textWrapper, browserActionList, fontSizeAdjuster, lineHeightAdjuster } = createOverlayElements();
appendElementsToBody(websiteContainerWrapper);
setInitialCSSVariables(settings);
const textElement = initialiseTextElement(textWrapper, settings);

setupMouseEvents(window.electronAPI);


(async () => {
    const textLogList = await window.electronAPI.getSetting('textLog');
    if (textLogList.length > 0) {
        updateTextContent(textLogList[textLogList.length-1]);
    }
})();

setupWebSocket(electronAPI);

setupInteractJS(textWrapper, fontSizeAdjuster, lineHeightAdjuster, settings);

window.electronAPI.toggleStyles(() => {
    toggleStyles();
});

window.electronAPI.exportSettings(() => {
    exportSettings(window.electronAPI);
});
