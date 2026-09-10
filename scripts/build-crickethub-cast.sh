#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
WORK="${RUNNER_TEMP:-/tmp}/crickethub-screencast"
rm -rf "$WORK"
git clone --depth 1 https://github.com/ddagunts/ScreenCast.git "$WORK"

mkdir -p "$WORK/app/src/main/java/io/github/ddagunts/screencast"
cp "$ROOT/android-cast-overlay/CricketHubCastActivity.kt" \
  "$WORK/app/src/main/java/io/github/ddagunts/screencast/CricketHubCastActivity.kt"

python3 - "$WORK/app/src/main/AndroidManifest.xml" <<'PY'
from pathlib import Path
import sys
p = Path(sys.argv[1])
s = p.read_text()
needle = '''        <activity\n            android:name=".ui.MainActivity"'''
activity = '''        <activity\n            android:name=".CricketHubCastActivity"\n            android:exported="true"\n            android:theme="@style/Theme.ScreenCast"\n            android:excludeFromRecents="true">\n            <intent-filter>\n                <action android:name="android.intent.action.VIEW" />\n                <category android:name="android.intent.category.DEFAULT" />\n                <category android:name="android.intent.category.BROWSABLE" />\n                <data android:scheme="crickethub" android:host="cast" />\n            </intent-filter>\n        </activity>\n\n'''
if '.CricketHubCastActivity' not in s:
    s = s.replace(needle, activity + needle, 1)
p.write_text(s)
PY

python3 - "$WORK/app/src/main/java/io/github/ddagunts/screencast/WebRtcProjectionRequestActivity.kt" <<'PY'
from pathlib import Path
import sys
p = Path(sys.argv[1])
s = p.read_text()
s = s.replace('import android.content.Intent\n', 'import android.content.Intent\nimport android.net.Uri\n')
old = '''            startForegroundService(svc)\n        } else {'''
new = '''            startForegroundService(svc)\n            // Return the player to the foreground after the system consent dialog.\n            // MediaProjection then captures the actual CricketHub player surface.\n            intent.getStringExtra(WebRtcForegroundService.EXTRA_PLAYER_URL)?.let { url ->\n                runCatching { startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url))) }\n            }\n        } else {'''
if old not in s:
    raise SystemExit('projection patch target not found')
s = s.replace(old, new, 1)
p.write_text(s)
PY

./gradlew --no-daemon assembleDebug
mkdir -p "$ROOT/artifacts"
cp "$WORK/app/build/outputs/apk/debug/app-debug.apk" "$ROOT/artifacts/CricketHub-Cast-debug.apk"
printf '\nAPK: %s\n' "$ROOT/artifacts/CricketHub-Cast-debug.apk"
