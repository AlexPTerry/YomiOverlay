import interact from 'interactjs';

import './overlay.css';

import { createOverlayElements, appendElementsToBody, updateCSSVariable, setInitialCSSVariables } from './dom-elements';
import { setupMouseEvents } from './mouse-events';
import { initialiseTextElement, updateTextContent, setTextState } from './text-handler';
import { setupWebSocket } from './websocket-service';


let settings = JSON.parse(JSON.stringify(initialSettings));
settings.textBox.height = settings.textBox.lines * 16 * settings.lineHeight;

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

interact('#text-wrapper').draggable({
    listeners: {
        move(event) {
            if (settings.state!=1) { // Check if drag is enabled
                return; // Exit the function if drag is disabled
            }
            settings.textBox.left += event.dx;
            settings.textBox.top += event.dy;
            document.body.style.setProperty("--text-box-left", `${settings.textBox.left}px`);
            document.body.style.setProperty("--text-box-top", `${settings.textBox.top}px`);
        }
    }
});

interact('#text-wrapper').resizable({
    edges: { top: true, bottom: true, right: true, left: true},
    listeners: {
        move(event) {
            if (settings.state!=1) { // Check if drag is enabled
                return; // Exit the function if drag is disabled
            }

            if (event.edges.right) {
                settings.textBox.width += event.dx;
                document.body.style.setProperty("--text-box-width", `${settings.textBox.width}px`);
            }
            
            if (event.edges.bottom) {
                settings.textBox.height += event.dy;
                document.body.style.setProperty("--text-box-height", `${settings.textBox.height}px`);
            }

            if (event.edges.left) {
                settings.textBox.left += event.dx
                settings.textBox.width -= event.dx;
                document.body.style.setProperty("--text-box-left", `${settings.textBox.left}px`);
                document.body.style.setProperty("--text-box-width", `${settings.textBox.width}px`);
            }
            
            if (event.edges.top) {
                settings.textBox.top += event.dy
                settings.textBox.height -= event.dy;
                document.body.style.setProperty("--text-box-top", `${settings.textBox.top}px`);
                document.body.style.setProperty("--text-box-height", `${settings.textBox.height}px`);
            }
        }
    },
    modifiers: [
        interact.modifiers.restrictSize({
            min: { width: 50, height: 10 }
        })
    ]
});

interact('#font-size-adjuster').draggable({
    onmove: fontSizeDragMoveListener, // Font size drag always enabled - adjust if needed
    inertia: false,
});

interact('#line-height-adjuster').draggable({
    onmove: lineHeightDragMoveListener, // Font size drag always enabled - adjust if needed
    inertia: false,
});


function fontSizeDragMoveListener(event) {
    const target = event.target;
    const dy = event.dy;

    settings.fontSize -= dy * 0.01;
    settings.fontSize = Math.max(0.5, Math.min(3.0, settings.fontSize));
    document.body.style.setProperty("--font-size", `${settings.fontSize}rem`);
}

function lineHeightDragMoveListener(event) {
    const target = event.target;
    const dy = event.dy;

    settings.lineHeight -= dy * 0.01;
    settings.lineHeight = Math.max(0.7, Math.min(4.2, settings.lineHeight));
    // textWrapper.style.height = 3*settings.lineHeight + 'rem';
    settings.textBox.height = settings.textBox.lines * settings.lineHeight;
    document.body.style.setProperty("--text-box-height", `${settings.textBox.height}rem`);
    document.body.style.setProperty("--line-height", `${settings.lineHeight}rem`);
}

// document.head.appendChild(interactScript);

function toggleStyles() {

    if (settings.state === 1) {
        document.body.style.setProperty('--visibility', 'hidden');
        document.body.style.setProperty('--pointer-events', 'none');
        settings.state = 2;
        console.log("Style State toggled to: State 2");
    } else {
        document.body.style.setProperty('--visibility', 'visible');
        document.body.style.setProperty('--pointer-events', 'auto');
        settings.state = 1;
        console.log("Style State toggled to: State 1");
    }
    setTextState(settings.state);
}

window.electronAPI.toggleStyles(() => {
    toggleStyles();
});

window.electronAPI.exportSettings(() => {
    // Export settings and set as default
    settings.profile = 'exported';
    window.electronAPI.setSetting('activeProfile', settings.profile);
    window.electronAPI.setSetting(settings.profile, settings);
});

// document.addEventListener('keydown', function(event) {
    // if (event.key === 'o' || event.key === 'O') {
    //     toggleStyles();
    // }
    // if (event.key === 'i' || event.key === 'I') {
    //     // Export settings and set as default
    //     settings.profile = 'exported';
    //     window.electronAPI.setSetting('activeProfile', settings.profile);
    //     window.electronAPI.setSetting(settings.profile, settings);
    // }
    // if (event.key === 't' || event.key === 'T') {
    //     window.electronAPI.openTextLog();
    // }
// });

// The below prevents annoying text selections (hard to dese)
// function deselectText() {
//     if (window.getSelection) {
//         window.getSelection().removeAllRanges();
//     } else if (document.selection) { // For old IE browsers
//         document.selection.empty();
//     }
// }
// document.addEventListener('click', deselectText);