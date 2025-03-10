const { FusesPlugin } = require('@electron-forge/plugin-fuses');
const { FuseV1Options, FuseVersion } = require('@electron/fuses');
const path = require('path');
const fs = require('fs-extra');

module.exports = {
  packagerConfig: {
    asar: true,
    // extraResource: ["extensions"],
    afterCopy: [
      // Weird workaround because I can't figure out how else to get extensions to be placed in the root directory
      (buildPath, electronVersion, platform, arch, callback) => {
        const sourceFolder = path.join(buildPath, ".webpack", "main", "extensions");
        const targetFolder = path.join(buildPath, "..", "..", "extensions");
        console.log('Target folder: ', targetFolder);
        fs.readdir(path.join(buildPath, ".webpack"), (err, files) => {
          if (err) {
            console.error("Error reading directory:", err);
            return;
          }
          console.log("Files:", files);
        });
        fs.move(sourceFolder, targetFolder, { overwrite: true })
          .then(() => callback())
          .catch(callback);
      }
    ]
  },
  rebuildConfig: {},
  makers: [
    {
      name: '@electron-forge/maker-squirrel',
      config: {},
    },
    {
      name: '@electron-forge/maker-zip',
      platforms: ['darwin'],
    },
    {
      name: '@electron-forge/maker-deb',
      config: {},
    },
    {
      name: '@electron-forge/maker-rpm',
      config: {},
    },
  ],
  plugins: [
    {
      name: '@electron-forge/plugin-auto-unpack-natives',
      config: {},
    },
    {
      name: '@electron-forge/plugin-webpack',
      config: {
        mainConfig: './webpack.main.config.js',
        devContentSecurityPolicy: "connect-src 'self' * 'unsafe-eval'",
        renderer: {
          config: './webpack.renderer.config.js',
          entryPoints: [
            {
              html: './renderer/overlay.html',
              js: './renderer/overlay.js',
              name: 'overlay',
              preload: {
                js: './main/preload.js',
              },
            },
            {
              html: './renderer/text_log.html',
              js: './renderer/text_log.js',
              name: 'text_log',
              preload: {
                js: './main/text_log_preload.js',
              },
            },
            // {
            //   html: './src/index.html',
            //   js: './src/renderer.js',
            //   name: 'text_log',
            //   preload: {
            //     js: './src/preload.js',
            //   },
            // },
            // {
            //   html: './src/index.html',
            //   js: './src/renderer.js',
            //   name: 'overlay',
            //   preload: {
            //     js: './src/preload.js',
            //   },
            // },
            // {
            //   html: './src/index.html',
            //   js: './src/renderer.js',
            //   name: 'main_window',
            //   preload: {
            //     js: './src/preload.js',
            //   },
            // }
          ],
        },
      },
    },
    { // This is needed to help forge package up uiohook (but not koffi or nutjs), for some reason
      name: '@timfish/forge-externals-plugin',
      config: {
        "externals": ["uiohook-napi"],
        "includeDeps": true
      }
    },
    // Fuses are used to enable/disable various Electron functionality
    // at package time, before code signing the application
    new FusesPlugin({
      version: FuseVersion.V1,
      [FuseV1Options.RunAsNode]: false,
      [FuseV1Options.EnableCookieEncryption]: true,
      [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
      [FuseV1Options.EnableNodeCliInspectArguments]: false,
      [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
      [FuseV1Options.OnlyLoadAppFromAsar]: true,
    }),
  ],
};
