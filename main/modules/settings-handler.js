const { screen } = require('electron');

let store;

function setDefaultSettings() {
    const { width, height } = screen.getPrimaryDisplay().size;

    let defaultSettings = {
        profile: 'default',
        state: 1,
        fontSize: 1.5,
        lineHeight: 2.1,
        textBox: {
            top: height * 0.7,
            left: width * 0.15,
            width: width * 0.7,
            lines: 3,
        }
    };

    store.set('default', defaultSettings);
    if (!store.get('activeProfile')) store.set('activeProfile', 'default');
    if (!store.get('textLog')) store.set('textLog', []);
}

function getCurrentSettings() {
    return store.get(store.get('activeProfile'));
}

module.exports.getStore = function(key) {
    return store.get(key);
}

module.exports.setStore = function(key, value) {
    store.set(key, value);
}

module.exports.loadSettings = async function() {
    const Store = (await import("electron-store")).default;
    store = new Store();

    setDefaultSettings();
    return getCurrentSettings();
}