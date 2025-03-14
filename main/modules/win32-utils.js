const koffi = require('koffi');

// TODO: Expose functions as pascal-case functions with QOL changes (e.g. no messing around with buffers)

const user32 = koffi.load('user32.dll');
const kernel32 = koffi.load('kernel32.dll');

module.exports.GetLastError = kernel32.func('__stdcall', 'GetLastError', 'uint', []);
module.exports.PostMessageW = user32.func('__stdcall', 'PostMessageW', 'bool', ['void *', 'uint', 'uintptr_t', 'intptr_t']);
module.exports.GetForegroundWindow = user32.func("GetForegroundWindow", "int", []);
module.exports.GetWindowTextW = user32.func("GetWindowTextW", "int", ["void *", "char *", "int"]);
module.exports.GetClassName = user32.func('__stdcall', 'GetClassNameA', 'int', ['void *', 'char *', 'int']);
module.exports.IsWindowVisible = user32.func('__stdcall', 'IsWindowVisible', 'bool', ['void *']);

const EnumWindowsProc = koffi.proto('__stdcall', 'EnumWindowsProc', 'bool', ['int', 'intptr_t']);
const EnumWindows = user32.func('__stdcall', 'EnumWindows', 'bool', [koffi.pointer(EnumWindowsProc), 'intptr_t']);

const WM_KEYDOWN = 0x0100;
const WM_KEYUP = 0x0101;
const VK_SPACE = 0x20;

module.exports.findWindowHandle = function(partialTitle) { 
    let handle = 0;
    let windows = [];

    const enumWindowsCallback = koffi.register(
        (wHandle, lParam) => {
            let titleBuffer = Buffer.alloc(256);
            let classBuffer = Buffer.alloc(256);
    
            module.exports.GetWindowTextW(wHandle, titleBuffer, 256); 
            module.exports.GetClassName(wHandle, classBuffer, 256); 
    
            let title = titleBuffer.toString('ucs2').replace(/\0/g, ''); // Remove null chars
            let className = classBuffer.toString('ucs2').replace(/\0/g, '');
    
            let titleUTF8 = titleBuffer.toString('utf8').replace(/\0/g, ''); 
            let classNameUTF8 = classBuffer.toString('utf8').replace(/\0/g, '');
    
            if (module.exports.IsWindowVisible(wHandle) && title.length > 0) {
                windows.push(`${title} | ${className} | ${wHandle}`); // Filter out e.g. file explorer on class name
                windows.push(`${titleUTF8} | ${classNameUTF8} | ${wHandle}`);
                if (className.includes(partialTitle) || classNameUTF8.includes(partialTitle)) {
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