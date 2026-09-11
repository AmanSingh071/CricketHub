#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
WORK="${RUNNER_TEMP:-/tmp}/crickethub-screencast"
rm -rf "$WORK"
git clone --depth 1 https://github.com/ddagunts/ScreenCast.git "$WORK"

rm -rf "$WORK/app/src/main/java/io/github/ddagunts/screencast/webrtc"
rm -f "$WORK/app/src/main/java/io/github/ddagunts/screencast/WebRtcForegroundService.kt"
rm -f "$WORK/app/src/main/java/io/github/ddagunts/screencast/WebRtcProjectionRequestActivity.kt"
rm -f "$WORK/app/src/main/java/io/github/ddagunts/screencast/ui/WebRtcScreen.kt"
rm -f "$WORK/app/src/main/java/io/github/ddagunts/screencast/ui/WebRtcViewModel.kt"
rm -f "$WORK/app/src/main/java/io/github/ddagunts/screencast/ui/SettingsScreen.kt"

mkdir -p "$WORK/app/src/main/java/io/github/ddagunts/screencast" "$WORK/app/src/main/res/drawable"
cp "$ROOT/android-cast-overlay/CricketHubCastActivity.kt" "$WORK/app/src/main/java/io/github/ddagunts/screencast/CricketHubCastActivity.kt"
cp "$ROOT/android-cast-overlay/MainActivity.kt" "$WORK/app/src/main/java/io/github/ddagunts/screencast/ui/MainActivity.kt"
cp "$ROOT/android-cast-overlay/ic_crickethub.xml" "$WORK/app/src/main/res/drawable/ic_crickethub.xml"

python3 - "$WORK/app/src/main/AndroidManifest.xml" "$WORK/app/src/main/res/values/strings.xml" <<'PY'
from pathlib import Path
import re,sys
manifest=Path(sys.argv[1]); strings=Path(sys.argv[2]); s=manifest.read_text()
if 'android.permission.INTERNET' not in s:
    s=s.replace('<application','<uses-permission android:name="android.permission.INTERNET" />\n\n    <application',1)
s=s.replace('android:icon="@mipmap/ic_launcher"','android:icon="@drawable/ic_crickethub"').replace('android:roundIcon="@mipmap/ic_launcher_round"','android:roundIcon="@drawable/ic_crickethub"')
if 'android:hardwareAccelerated=' not in s:
    s=s.replace('<application','<application android:hardwareAccelerated="true"',1)
s=re.sub(r'\n\s*<activity\s+android:name="\.WebRtcProjectionRequestActivity".*?</activity>\s*','\n',s,flags=re.S)
s=re.sub(r'\n\s*<service\s+android:name="\.WebRtcForegroundService".*?</service>\s*','\n',s,flags=re.S)
needle='''        <activity
            android:name=".ui.MainActivity"'''
activity='''        <activity
            android:name=".CricketHubCastActivity"
            android:exported="true"
            android:theme="@style/Theme.ScreenCast"
            android:excludeFromRecents="true">
            <intent-filter>
                <action android:name="android.intent.action.VIEW" />
                <category android:name="android.intent.category.DEFAULT" />
                <category android:name="android.intent.category.BROWSABLE" />
                <data android:scheme="crickethub" android:host="cast" />
            </intent-filter>
        </activity>

'''
if '.CricketHubCastActivity' not in s:
    if needle not in s: raise SystemExit('manifest insertion point missing')
    s=s.replace(needle,activity+needle,1)
manifest.write_text(s)
strings.write_text(strings.read_text().replace('<string name="app_name">ScreenCast</string>','<string name="app_name">CricketHub</string>'))
PY

python3 - "$WORK/settings.gradle.kts" "$WORK/app/build.gradle.kts" <<'PY'
from pathlib import Path
import re,sys
settings=Path(sys.argv[1]); gradle=Path(sys.argv[2])
s=settings.read_text()
# Keep the build independent of Mozilla/GeckoView: the app now uses the native Android WebView.
s=s.replace('        maven { url = uri("https://maven.mozilla.org/maven2/") }\n','')
settings.write_text(s)
g=gradle.read_text()
g=re.sub(r'\s*implementation\(["\']org\.mozilla\.geckoview:[^)]*\)\n?','\n',g)
g=re.sub(r'\s*implementation\(["\']org\.mozilla\.geckoview[^)]*\)\n?','\n',g)
g=g.replace('implementation(libs.webrtc.sdk.android)','')
# Keep Java/Kotlin on the same modern toolchain as the upstream project.
if 'sourceCompatibility = JavaVersion.VERSION_17' not in g:
    g=g.replace('android {','android {\n    compileOptions {\n        sourceCompatibility = JavaVersion.VERSION_17\n        targetCompatibility = JavaVersion.VERSION_17\n    }',1)
gradle.write_text(g)
PY

chmod +x "$WORK/gradlew"
cd "$WORK"
./gradlew --no-daemon clean assembleDebug
mkdir -p "$ROOT/artifacts"
cp "$WORK/app/build/outputs/apk/debug/app-debug.apk" "$ROOT/artifacts/CricketHub-Android-debug.apk"
printf '\nAPK: %s\n' "$ROOT/artifacts/CricketHub-Android-debug.apk"
