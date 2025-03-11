const { FusesPlugin } = require('@electron-forge/plugin-fuses');
const { FuseV1Options, FuseVersion } = require('@electron/fuses');
const path = require('path');
const fs = require('fs-extra');

module.exports = {
  packagerConfig: {
    asar: true,
    // extraResource: ["extensions"], // May be better practice to just put the extensions folder in the resources folder
    afterCopy: [
      // Weird workaround because I can't figure out how else to get extensions to be placed in the root directory
      // Using a different hook (afterPackage?) along with extraResource might be less janky and avoid needing CopyWebpackPlugin
      (buildPath, electronVersion, platform, arch, callback) => {
        const sourceFolder = path.join(buildPath, ".webpack", "main", "extensions");
        const targetFolder = path.join(buildPath, "..", "..", "extensions");
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
              html: './renderer/overlay/overlay.html',
              js: './renderer/overlay/overlay.js',
              name: 'overlay',
              preload: {
                js: './renderer/overlay/overlay-preload.js',
              },
            },
            {
              html: './renderer/text_log/text-log.html',
              js: './renderer/text_log/text-log.js',
              name: 'text_log',
              preload: {
                js: './renderer/text_log/text-log-preload.js',
              },
            },
          ],
        },
      },
    },
    { // This is needed to help forge package up uiohook (but not koffi or nutjs for some reason)
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
