const { FusesPlugin } = require('@electron-forge/plugin-fuses');
const { FuseV1Options, FuseVersion } = require('@electron/fuses');

module.exports = {
  packagerConfig: {
    // prune: false,
    asar: true,
    // extraResource: ["node_modules/uiohook-napi", "node_modules/uiohook-napi/prebuilds"]
    // asar: {
    //   unpack: "main/native_modules/build/**"
    // }
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
            // {
            //   html: './src/index.html',
            //   js: './src/renderer.js',
            //   name: 'overlay',
            //   preload: {
            //     js: './src/preload.js',
            //   },
            // }
          ],
        },
      },
    },
    {
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
