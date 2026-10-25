# Coloring Book for Android

A thin Android shell (one Kotlin activity) around the **same `web/` folder** that powers the
GitHub Pages site. Gradle packages `../web` as the app's assets and a `WebView` serves it from
`https://appassets.androidplatform.net/`, so the site and the APK run identical code:

| Shared (the `web/` folder) | Android only (`coloringbook/`) |
|----------------------------|--------------------------------|
| every page, the drawing/fill/eraser code, uploads, categories, autosave, UI | the WebView host, the file picker for uploads, saving PNGs to Pictures, the icon |

Only one hook exists on the shared side: when `window.AndroidBridge` is present, **Save PNG**
hands the image to the app (a WebView can't download blobs); otherwise it downloads normally.

No permissions are requested and the app works fully offline. Uploaded pictures and your coloring
are stored in the app's own WebView storage, separate from the website's.

## Build

```
./gradlew :coloringbook:assembleRelease
# -> coloringbook/build/outputs/apk/release/coloringbook-release.apk
```

Needs the Android SDK (platform 36). The `Build Coloring Book APK` workflow does this on every
change to `web/` or `coloringbook/` on `main` and publishes `ColoringBook.apk` to the
`apk-latest` release.

## Signing

`coloringbook.keystore` is committed on purpose with the password `coloringbook`. It keeps every
build signed the same way so a new APK installs over the old one without losing your pictures.
It is not a secure store-release key; do not reuse it for anything that needs one.
