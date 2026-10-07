// Expo config plugin: signs Android release builds with the production
// keystore and takes the versionCode from the environment, so CI can build a
// store-ready APK from a clean `expo prebuild` (android/ is never committed).
//
// Environment (set by .github/workflows/android-release.yml):
//   ANDROID_KEYSTORE_PATH, ANDROID_KEYSTORE_PASSWORD, ANDROID_KEY_ALIAS,
//   ANDROID_KEY_PASSWORD  -> release signing (falls back to the debug key
//                            when absent, e.g. local `expo run:android`)
//   ANDROID_VERSION_CODE  -> versionCode (defaults to the app.json value)
const { withAppBuildGradle } = require('expo/config-plugins');

const RELEASE_SIGNING_CONFIG = `
        release {
            if (System.getenv('ANDROID_KEYSTORE_PATH')) {
                storeFile file(System.getenv('ANDROID_KEYSTORE_PATH'))
                storePassword System.getenv('ANDROID_KEYSTORE_PASSWORD')
                keyAlias System.getenv('ANDROID_KEY_ALIAS')
                keyPassword System.getenv('ANDROID_KEY_PASSWORD')
            }
        }`;

function replaceOnce(source, search, replacement, description) {
  if (!source.includes(search)) {
    throw new Error(`withReleaseSigning: could not find ${description} in android/app/build.gradle`);
  }
  return source.replace(search, replacement);
}

module.exports = function withReleaseSigning(config) {
  return withAppBuildGradle(config, (mod) => {
    let gradle = mod.modResults.contents;
    if (gradle.includes('ANDROID_KEYSTORE_PATH')) return mod;

    gradle = replaceOnce(gradle, '    signingConfigs {', `    signingConfigs {${RELEASE_SIGNING_CONFIG}`, 'signingConfigs');

    // The release build type is the second "signingConfig signingConfigs.debug".
    const releaseBlock = gradle.indexOf('        release {', gradle.indexOf('    buildTypes {'));
    if (releaseBlock === -1) throw new Error('withReleaseSigning: release build type not found');
    gradle =
      gradle.slice(0, releaseBlock) +
      replaceOnce(
        gradle.slice(releaseBlock),
        'signingConfig signingConfigs.debug',
        "signingConfig System.getenv('ANDROID_KEYSTORE_PATH') ? signingConfigs.release : signingConfigs.debug",
        'release signingConfig',
      );

    gradle = gradle.replace(
      /versionCode (\d+)/,
      (_, current) => `versionCode((System.getenv('ANDROID_VERSION_CODE') ?: '${current}').toInteger())`,
    );

    mod.modResults.contents = gradle;
    return mod;
  });
};
