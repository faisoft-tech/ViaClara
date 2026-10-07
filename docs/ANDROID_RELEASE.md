# APK de producción (GitHub Actions)

El workflow `.github/workflows/android-release.yml` genera un **APK de
producción firmado** cada vez que llega a `master` un push con algún commit
cuyo mensaje contenga `[PROD]`, por ejemplo:

```sh
git commit -m "[VC-012] [PROD] Mapa y fotos en la app"
git push
```

También se puede lanzar a mano desde **Actions → Android production APK → Run
workflow**.

## Qué hace

1. `npm ci` y `npx expo prebuild --platform android` (la carpeta `android/`
   no se versiona: se genera en cada build).
2. Compila con `./gradlew assembleRelease` firmando con el keystore de
   producción (plugin `plugins/withReleaseSigning.js`).
3. Comprueba con `apksigner` que el APK **no** está firmado con la clave de
   debug.
4. Publica el APK como artefacto del workflow (30 días) y como **GitHub
   Release** (`android-v<versión>-<nº de build>`), desde donde se descarga e
   instala en cualquier Android.

- `versionCode` = número de ejecución del workflow (siempre creciente).
- `versionName` = `expo.version` de `app.json`.
- Paquete Android: `com.viaclara.app` (**no se puede cambiar** una vez
  publicada la app en Google Play).
- La URL de la API sale de la variable de repositorio `EXPO_PUBLIC_API_URL`
  (*Settings → Secrets and variables → Actions → Variables*); si no existe se
  usa la API de `dev`.

## Configuración (una sola vez)

El keystore de producción está **fuera del repo**, en
`%USERPROFILE%\.viaclara\android-signing\`:

- `viaclara-release.jks` — el keystore (alias `viaclara`, RSA 4096).
- `credentials.env` — sus contraseñas.

**Haz copia de seguridad de esa carpeta** en un gestor de contraseñas o
almacenamiento seguro. Si se pierde, las actualizaciones firmadas con otra
clave no se instalan encima de la app existente.

Para subir los secretos a GitHub (requiere `gh` con permisos de administrador
en el repo):

```sh
gh auth status                      # cuenta con acceso a faisoft-tech/ViaClara
scripts/set-android-secrets.sh      # o: scripts/set-android-secrets.sh owner/repo
```

Crea los secretos `ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`,
`ANDROID_KEY_ALIAS` y `ANDROID_KEY_PASSWORD`. Si falta alguno, el workflow
falla en el primer paso indicando cuál.

## Google Play

Para publicar en Play Store, Google pide un **AAB** en lugar de APK: basta con
cambiar `assembleRelease` por `bundleRelease` (salida en
`android/app/build/outputs/bundle/release/app-release.aab`). Con *Play App
Signing*, este keystore pasa a ser la clave de subida.
