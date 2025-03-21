const koffi = require('koffi');

console.log('attempted koffi');
// This is all windows only!
if (process.platform === 'win32') {

// TODO: Expose functions as pascal-case functions with QOL changes (e.g. no messing around with buffers)

const user32 = koffi.load('user32.dll');
const kernel32 = koffi.load('kernel32.dll');

module.exports.GetLastError = kernel32.func('__stdcall', 'GetLastError', 'uint', []);
module.exports.PostMessageW = user32.func('__stdcall', 'PostMessageW', 'bool', ['void *', 'uint', 'uintptr_t', 'intptr_t']);
module.exports.GetForegroundWindow = user32.func("GetForegroundWindow", "int", []);
module.exports.GetWindowTextW = user32.func("GetWindowTextW", "int", ["void *", "char *", "int"]);
module.exports.GetClassName = user32.func('__stdcall', 'GetClassNameA', 'int', ['void *', 'char *', 'int']);
module.exports.IsWindowVisible = user32.func('__stdcall', 'IsWindowVisible', 'bool', ['void *']);
module.exports.GetWindowThreadProcessId = user32.func('__stdcall', 'GetWindowThreadProcessId', 'uint32_t', ['void *', 'uint32_t *']);

const EnumWindowsProc = koffi.proto('__stdcall', 'EnumWindowsProc', 'bool', ['int', 'intptr_t']);
const EnumWindows = user32.func('__stdcall', 'EnumWindows', 'bool', [koffi.pointer(EnumWindowsProc), 'intptr_t']);

const WM_KEYDOWN = 0x0100;
const WM_KEYUP = 0x0101;
const VK_SPACE = 0x20;

console.log('attempted definition');
module.exports.findWindowHandle = function(partialTitle) { 
    let handle = 0;
    let windows = [];

    const enumWindowsCallback = koffi.register(
        (wHandle, lParam) => {
            let titleBuffer = Buffer.alloc(256);
            let classBuffer = Buffer.alloc(256);
            let ptrBuffer = Buffer.alloc(4);
            let ptr = [null];
    
            module.exports.GetWindowTextW(wHandle, titleBuffer, 256); 
            module.exports.GetClassName(wHandle, classBuffer, 256); 
            let tid = module.exports.GetWindowThreadProcessId(wHandle, ptrBuffer);
    
            let title = titleBuffer.toString('ucs2').replace(/\0/g, ''); // Remove null chars
            let className = classBuffer.toString('ucs2').replace(/\0/g, '');
    
            let titleUTF8 = titleBuffer.toString('utf8').replace(/\0/g, ''); 
            let classNameUTF8 = classBuffer.toString('utf8').replace(/\0/g, '');
            // let processId = ptrBuffer.toString('ucs2');
            let processId = ptrBuffer.readUInt32LE(0);
    
            if (module.exports.IsWindowVisible(wHandle) && title.length > 0) {
                // windows.push(`${title} | ${className} | ${wHandle}`); // Filter out e.g. file explorer on class name
                // windows.push(`${titleUTF8} | ${classNameUTF8} | ${wHandle}`);
                windows.push(`${title} | ${className} | ${wHandle} | ${processId}`); // Filter out e.g. file explorer on class name
                windows.push(`${titleUTF8} | ${classNameUTF8} | ${wHandle} | ${processId}`);
                if (className.includes(partialTitle) || classNameUTF8.includes(partialTitle)
                    || title.includes(partialTitle) || titleUTF8.includes(partialTitle)) {
                    handle = wHandle; 
                    return false; // Stop when found
                }
            }
            return true; // Continue enumeration
        },
        koffi.pointer(EnumWindowsProc)
    );

    EnumWindows(enumWindowsCallback, 0); 
    koffi.unregister(enumWindowsCallback); // Important to unregister to avoid memory leaks

    console.log(windows); // Can turn this off in prod or move to separate function
    return handle; // Return the found handle (or 0 if not found)
};


module.exports.findWindowHandleByPid = function(searchPid) { 
    let handle = 0;
    let windows = [];

    const enumWindowsCallback = koffi.register(
        (wHandle, lParam) => {
            let pidBuffer = Buffer.alloc(4);
            module.exports.GetWindowThreadProcessId(wHandle, pidBuffer);
            let currentPid = pidBuffer.readUInt32LE(0);
    
            if (module.exports.IsWindowVisible(wHandle)) {
                windows.push(`${currentPid}`);
                if (searchPid === currentPid) {
                    handle = wHandle; 
                    return false; // Stop when found
                }
            }
            return true; // Continue enumeration
        },
        koffi.pointer(EnumWindowsProc)
    );

    EnumWindows(enumWindowsCallback, 0); 
    koffi.unregister(enumWindowsCallback); // Important to unregister to avoid memory leaks

    console.log(windows); // Can turn this off in prod or move to separate function
    return handle; // Return the found handle (or 0 if not found)
};

module.exports.sendWindowSpace = async function(handle) {
    module.exports.PostMessageW(handle, WM_KEYDOWN, VK_SPACE, 0);
    module.exports.PostMessageW(handle, WM_KEYUP, VK_SPACE, 0);
}

}