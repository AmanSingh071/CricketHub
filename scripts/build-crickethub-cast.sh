#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
WORK="${RUNNER_TEMP:-/tmp}/crickethub-screencast"
rm -rf "$WORK"
git clone --depth 1 https://github.com/ddagunts/ScreenCast.git "$WORK"
mkdir -p "$WORK/app/src/main/java/io/github/ddagunts/screencast" "$WORK/app/src/main/res/drawable"
cp "$ROOT/android-cast-overlay/CricketHubCastActivity.kt" "$WORK/app/src/main/java/io/github/ddagunts/screencast/CricketHubCastActivity.kt"
cp "$ROOT/android-cast-overlay/MainActivity.kt" "$WORK/app/src/main/java/io/github/ddagunts/screencast/ui/MainActivity.kt"
cp "$ROOT/android-cast-overlay/ic_crickethub.xml" "$WORK/app/src/main/res/drawable/ic_crickethub.xml"
python3 - "$WORK/app/src/main/AndroidManifest.xml" "$WORK/app/src/main/res/values/strings.xml" <<'PY'
from pathlib import Path
import sys
manifest=Path(sys.argv[1]); strings=Path(sys.argv[2]); s=manifest.read_text()
if 'android.permission.INTERNET' not in s: s=s.replace('<application','<uses-permission android:name="android.permission.INTERNET" />\n\n    <application',1)
s=s.replace('android:icon="@mipmap/ic_launcher"','android:icon="@drawable/ic_crickethub"').replace('android:roundIcon="@mipmap/ic_launcher_round"','android:roundIcon="@drawable/ic_crickethub"')
if 'android:hardwareAccelerated=' not in s: s=s.replace('<application','<application android:hardwareAccelerated="true"',1)
needle='''        <activity\n            android:name=".ui.MainActivity"'''
activity='''        <activity\n            android:name=".CricketHubCastActivity"\n            android:exported="true"\n            android:theme="@style/Theme.ScreenCast"\n            android:excludeFromRecents="true">\n            <intent-filter>\n                <action android:name="android.intent.action.VIEW" />\n                <category android:name="android.intent.category.DEFAULT" />\n                <category android:name="android.intent.category.BROWSABLE" />\n                <data android:scheme="crickethub" android:host="cast" />\n            </intent-filter>\n        </activity>\n\n'''
if '.CricketHubCastActivity' not in s:
    if needle not in s: raise SystemExit('CricketHubCastActivity manifest insertion point not found')
    s=s.replace(needle,activity+needle,1)
manifest.write_text(s)
strings.write_text(strings.read_text().replace('<string name="app_name">ScreenCast</string>','<string name="app_name">CricketHub</string>'))
PY
# Embedded GeckoView: no Android System WebView and no Custom Tabs.
python3 - "$WORK/settings.gradle.kts" "$WORK/app/build.gradle.kts" <<'PY'
from pathlib import Path
import sys,re
settings=Path(sys.argv[1]); gradle=Path(sys.argv[2])
s=settings.read_text()
if 'maven.mozilla.org/maven2' not in s:
    s=s.replace('        mavenCentral()\n','        mavenCentral()\n        maven { url = uri("https://maven.mozilla.org/maven2/") }\n',1)
settings.write_text(s)
g=gradle.read_text()
g=re.sub(r'\s*implementation\("androidx\.browser:browser:[^\"]+"\)\n','\n',g)
if 'org.mozilla.geckoview:geckoview:' not in g:
    g=g.replace('dependencies {','dependencies {\n    implementation("org.mozilla.geckoview:geckoview:157.0.20260909211052")\n',1)
gradle.write_text(g)
PY
python3 - "$WORK/app/src/main/java/io/github/ddagunts/screencast/WebRtcProjectionRequestActivity.kt" <<'PY'
from pathlib import Path
import sys
p=Path(sys.argv[1]); s=p.read_text().replace('WebRtcForegroundService.EXTRA_PLAYER_URL','"crickethub_player_url"')
if 'import android.net.Uri\n' not in s: s=s.replace('import android.content.Intent\n','import android.content.Intent\nimport android.net.Uri\n',1)
marker='            startForegroundService(svc)\n'
insert='''            startForegroundService(svc)\n            intent.getStringExtra("crickethub_player_url")?.let { url ->\n                runCatching { startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url))) }\n            }\n'''
if 'intent.getStringExtra("crickethub_player_url")' not in s:
    if marker not in s: raise SystemExit('WebRTC foreground-service start point not found')
    s=s.replace(marker,insert,1)
p.write_text(s)
PY
chmod +x "$WORK/gradlew"
cd "$WORK"
./gradlew --no-daemon assembleDebug
mkdir -p "$ROOT/artifacts"
cp "$WORK/app/build/outputs/apk/debug/app-debug.apk" "$ROOT/artifacts/CricketHub-Android-debug.apk"
printf '\nAPK: %s\n' "$ROOT/artifacts/CricketHub-Android-debug.apk"
