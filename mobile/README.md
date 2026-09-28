# Sera Time Android wrapper

This project is an Android-first Sera Time app. The web application is hosted on Vercel and the Android shell uses Capacitor to load the HTTPS app while adding native secure-screen behavior.

## Developer setup
1. Install Node.js 22+ and Android Studio.
2. From the project root run `npm install`.
3. Put your production URL in `NEXT_PUBLIC_APP_URL`.
4. Run `npx cap add android` once.
5. Copy `mobile/android-plugin/SecureScreenPlugin.kt` into the generated Android app under `android/app/src/main/java/com/seratime/app/`.
6. Register the plugin in `MainActivity.kt` as shown below.
7. Run `npx cap sync android` and `npx cap open android`.
8. In Android Studio set the application ID to `com.seratime.app`, add your app icon, signing key, and build an AAB for Google Play.

## MainActivity registration
After `npx cap add android`, edit `android/app/src/main/java/com/seratime/app/MainActivity.kt`:

```kotlin
package com.seratime.app

import android.os.Bundle
import com.getcapacitor.BridgeActivity

class MainActivity : BridgeActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        registerPlugin(SecureScreenPlugin::class.java)
    }
}
```

The plugin turns Android `FLAG_SECURE` on while a protected submission preview is open and turns it off when the preview closes. This is an Android OS control; it cannot guarantee protection against every external camera or another device recording the screen.

## Play Store
Build a signed Android App Bundle (`.aab`) from Android Studio. Create the Play Console app, complete the store listing, privacy/data-safety forms, content declarations, screenshots, app icon, and upload the AAB to a testing track before production release.
