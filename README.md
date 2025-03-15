# YomiOverlay
Overlay that enables extension integration with tools like Yomitan. Not yet ready for general use.

Functionality such as forwarding space inputs, showing/hiding based upon foreground window currently only available on Windows, and requires that part of your desired program name is entered manually (for now) into the `partialName` variable in `main/main.js`. May not work at all on non-Windows OS!

## Setup
Upon cloning, create an `extensions` folder in the root directory and place the unzipped Yomitan extension inside, with the folder name 'yomitan-chrome'. (will be made non-manual in future).

Expects text to arrive on port 9001 (e.g. from  textractorSender), which must be active on `npm start`. 

## Usage
Upon first load, setup Yomitan (export your existing Yomitan settings and dictionaries and re-import them). Play until some multi-line text appears, then drag and resize the blue overlay text box in line with the game window text box. Drag the white and red circles at the top right of your screen to line up the font size and line height. When satisfied, press `Alt-O` to hide the settings and `Alt-I` to save your settings.

Get started with
```shell
npm install
npm start
```
Project can be built with
```shell
npm run make
```
The Squirrel installer is not set up to work currently but the generated build should work.

Relevant shortcuts (not settable manually at the moment!):
 - `Alt-O`: Toggle between mining mode/settings mode
 - `Alt-I`: Save current settings (preset switching in future...)
 - `Alt-T`: Show/hide the text log
 - `Alt-W`: Shut down the overlay
