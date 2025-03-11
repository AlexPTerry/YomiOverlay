import './text-log.css';

import { populateTextLog } from './modules/text-log-handler';
import { initialiseControls } from './modules/control-handler';

async function initialiseTextLog() {
    initialiseControls(window.electronAPI);

    // Still need to add a hook to update text log itself when new data comes in
    // Character update hook also not being triggered at the moment except at initialisation
    let paragraphArray = await window.electronAPI.getSetting('textLog');
    if (paragraphArray) {
        populateTextLog(paragraphArray);
    }
}

initialiseTextLog();