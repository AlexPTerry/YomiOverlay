import { setTextState } from './text-handler'; // Import setTextState if needed
import { updateCSSVariable } from './dom-elements'; // Import CSS variable update

let settings;

export function initialiseSettings(initialSettings) {
    settings = JSON.parse(JSON.stringify(initialSettings));
    settings.textBox.height = settings.textBox.lines * 16 * settings.lineHeight; // Initial height calculation - should maybe be offloaded to default part
    return settings;
}

export function toggleStyles() {
    if (settings.state === 1) {
        updateCSSVariable('--visibility', 'hidden');
        updateCSSVariable('--pointer-events', 'none');
        settings.state = 2;
        console.log("Style State toggled to: State 2");
    } else {
        updateCSSVariable('--visibility', 'visible');
        updateCSSVariable('--pointer-events', 'auto');
        settings.state = 1;
        console.log("Style State toggled to: State 1");
    }
    setTextState(settings.state);
}

export function exportSettings(electronAPI) {
    settings.profile = 'exported';
    electronAPI.setSetting('activeProfile', settings.profile);
    electronAPI.setSetting(settings.profile, settings);
}

export function getSettings() {
    return settings;
}