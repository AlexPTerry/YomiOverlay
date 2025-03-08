import './overlay.css';

// Create structure: website container and surrounding transparent divs
const websiteContainerWrapper = document.createElement('div');
websiteContainerWrapper.id = 'website-container-wrapper';

// const browserActionWrapper = document.createElement('div');
const browserActionList = document.createElement('browser-action-list');
browserActionList.classList.add('touchable'); // Element hidden by shadow root, does nothing
browserActionList.classList.add("hideable");

settings = JSON.parse(JSON.stringify(initialSettings));
settings.textBox.height = settings.textBox.lines * 16 * settings.lineHeight;

document.body.innerHTML = '';  // Clear the body

// Set CSS variables
document.body.style.setProperty("--font-size", `${settings.fontSize}rem`);
document.body.style.setProperty("--line-height", `${settings.lineHeight}rem`);
document.body.style.setProperty("--text-box-height", `${settings.textBox.height}px`);
document.body.style.setProperty("--text-box-top", `${settings.textBox.top}px`);
document.body.style.setProperty("--text-box-left", `${settings.textBox.left}px`);
document.body.style.setProperty("--text-box-width", `${settings.textBox.width}px`);

document.body.appendChild(websiteContainerWrapper);

console.log('window.electronAPI:', window.electronAPI);


let ignoreMouse = true;
let selectionTimer = false;

document.body.addEventListener('mouseover', (event) => {
    
    // Yomitan popup fulfils the last condition
    if (event.target.classList.contains('touchable') || event.target.tagName === 'button' || (event.target.parentElement === document.body && !event.target.id)) {
        window.electronAPI.setIgnoreMouseEvents(false);
        console.log('not pass through');
        ignoreMouse = false;
    }
});

document.body.addEventListener('mouseout', (event) => {
    // **UPDATED CHECK:** Check if the mouse left an element with class "touchable"
    if (event.target.classList.contains('touchable') || event.target.tagName === 'button' || (event.target.parentElement === document.body && !event.target.id)) {
        window.electronAPI.setIgnoreMouseEvents(true);
        console.log('pass through');
        ignoreMouse = true;

        if (window.getSelection) {
            setTimeout(() => {
                if (ignoreMouse) window.getSelection().removeAllRanges();
            }, 60);
        }
    }
});


const textWrapper = document.createElement('div');
textWrapper.id = 'text-wrapper';
textWrapper.classList.add('touchable');
textWrapper.classList.add('hideable');
websiteContainerWrapper.appendChild(textWrapper); // Text box

websiteContainerWrapper.appendChild(browserActionList); // Extension icons

const fontSizeAdjuster = document.createElement('div');
fontSizeAdjuster.id = 'font-size-adjuster';
fontSizeAdjuster.classList.add('touchable');
fontSizeAdjuster.classList.add('hideable');
websiteContainerWrapper.appendChild(fontSizeAdjuster);

const lineHeightAdjuster = document.createElement('div');
lineHeightAdjuster.id = 'line-height-adjuster';
lineHeightAdjuster.classList.add('touchable');
lineHeightAdjuster.classList.add('hideable');
websiteContainerWrapper.appendChild(lineHeightAdjuster);


(async () => {
    if (settings.state === 1) {
        document.documentElement.style.setProperty('--visibility', 'visible');
        document.documentElement.style.setProperty('--pointer-events', 'auto');
    } else {
        document.documentElement.style.setProperty('--visibility', 'hidden');
        document.documentElement.style.setProperty('--pointer-events', 'none');
    }
})();

(async () => {
    const textLogList = await window.electronAPI.getSetting('textLog');
    const textElement = document.createElement('span');
    textElement.textContent = textLogList[textLogList.length-1];
    textElement.classList.add('touchable');
    if (settings.state === 1) {
        textElement.classList.add('state-1');
    } else {
        textElement.classList.add('state-2');
    }
    console.log(textLogList[textLogList.length])
    textWrapper.appendChild(textElement);
})();



function setTextState(state) {
    const textParagraphs = document.querySelectorAll('#text-wrapper span'); // Or '#text-wrapper p' if you use that
    if (state === 1) {
        textParagraphs.forEach(p => {
            p.classList.add('state-1');
            p.classList.remove('state-2');
        });
    } else {
        textParagraphs.forEach(p => {
            p.classList.add('state-2');
            p.classList.remove('state-1');
        });
    }
}


// WebSocket connection to capture text data from the server
const socket = new WebSocket('ws://localhost:9001'); 

socket.onopen = () => {
    console.log('WebSocket connection established');
};

socket.onmessage = (event) => {
    console.log("Message received");
    // Parse the received message and extract only the "sentence" part
    const messageData = JSON.parse(event.data);
    const sentence = messageData.sentence;  // Get the sentence

    // Clear previous text
    textWrapper.innerHTML = '';

    // Create a new element for the sentence and append it
    const textElement = document.createElement('span');
    textElement.textContent = sentence;
    textElement.classList.add('touchable');
    if (settings.state === 1) {
        textElement.classList.add('state-1');
    } else {
        textElement.classList.add('state-2');
    }

    textWrapper.appendChild(textElement);
    window.electronAPI.addTextLog(sentence);
};

socket.onerror = (error) => {
    console.log('WebSocket Error:', error);
};

socket.onclose = () => {
    console.log('WebSocket connection closed');
};



// Dynamically inject InteractJS
const interactScript = document.createElement('script');
interactScript.src = "https://cdn.jsdelivr.net/npm/interactjs@latest";
interactScript.onload = () => {

    // let isDragEnabled = true; // Variable to track drag state, initially enabled

    // // Function to toggle drag state
    // function toggleDrag() {
    //     isDragEnabled = !isDragEnabled;
    //     console.log("Drag functionality toggled:", isDragEnabled ? "ON" : "OFF"); // Optional feedback
    // }

    // // Add event listener for 'P' key to toggle drag
    // document.addEventListener('keydown', function(event) {
    //     if (event.key === 'p' || event.key === 'P') {
    //         toggleDrag();
    //     }
    // });


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

};

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

document.head.appendChild(interactScript);

function toggleStyles() {

    if (settings.state === 1) {
        document.documentElement.style.setProperty('--visibility', 'hidden');
        document.documentElement.style.setProperty('--pointer-events', 'none');
        settings.state = 2;
        console.log("Style State toggled to: State 2");
    } else {
        document.documentElement.style.setProperty('--visibility', 'visible');
        document.documentElement.style.setProperty('--pointer-events', 'auto');
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