import './overlay.css';

import { createOverlayElements, appendElementsToBody, setInitialCSSVariables } from './modules/dom-elements';
import { setupMouseEvents } from './modules/mouse-events';
import { initialiseTextElement, updateTextContent } from './modules/text-handler';
import { setupWebSocket } from './modules/websocket-service';
import { setupInteractJS } from './modules/interact-setup';
import { initialiseSettings, toggleStyles, exportSettings } from './modules/settings-handler';

let settings;

async function initialiseOverlay() {
    settings = initialiseSettings(window.initialSettings); // initialSettings from preload

    // DOM element setup
    const { websiteContainerWrapper, textWrapper, browserActionList, fontSizeAdjuster, lineHeightAdjuster } = createOverlayElements();
    appendElementsToBody(websiteContainerWrapper);
    setInitialCSSVariables(settings); // Apply initial CSS based on settings
    const textElement = initialiseTextElement(textWrapper, settings); // Initialise text element

    // Event listener setup
    setupMouseEvents(window.electronAPI); // Mouse pass-through event listeners
    setupInteractJS(textWrapper, fontSizeAdjuster, lineHeightAdjuster, settings); // Setup drag/resize listeners
    setupWebSocket(window.electronAPI); // WebSocket connection and message handling

    // Load the initial text log
    loadInitialTextLog();

    // Electron API event handlers
    setupElectronAPIListeners();
}


// Initial text log load
async function loadInitialTextLog() {
    const textLogList = await window.electronAPI.getSetting('textLog');
    if (textLogList && textLogList.length > 0) {
        updateTextContent(textLogList[textLogList.length - 1]); // Display last log entry
    }
}

// Electron API listeners setup
function setupElectronAPIListeners() {
    window.electronAPI.toggleStyles(() => {
        toggleStyles();
    });

    window.electronAPI.exportSettings(() => {
        exportSettings(window.electronAPI);
    });
}


// Initialise everything
initialiseOverlay(); 