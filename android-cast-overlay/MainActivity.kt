package io.github.ddagunts.screencast.ui

import android.content.Intent
import android.graphics.Color
import android.net.Uri
import android.os.Bundle
import android.view.Gravity
import android.widget.LinearLayout
import android.widget.ProgressBar
import android.widget.TextView
import androidx.activity.ComponentActivity
import androidx.browser.customtabs.CustomTabsIntent

/**
 * CricketHub launcher.
 *
 * IMPORTANT: this intentionally does not create an Android WebView. Some phones
 * expose a device/GPU-specific WebView compositor bug where a correctly loaded
 * page is painted as a solid black surface. CricketHub is therefore rendered by
 * the device's Chromium browser through Android Custom Tabs. The CricketHub Cast
 * URI remains registered by this APK, so the Cast button can return to our native
 * Cast helper without requiring anything on the TV.
 */
class MainActivity : ComponentActivity() {
    private val homeUrl = "https://crickethub-vibe-coder22.vercel.app/"
    private var opened = false

    override fun onCreate(state: Bundle?) {
        super.onCreate(state)
        window.statusBarColor = Color.rgb(5, 14, 25)
        window.navigationBarColor = Color.rgb(5, 14, 25)
        showLauncher()
        openCricketHub()
    }

    private fun showLauncher() {
        val root = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER
            setBackgroundColor(Color.rgb(5, 14, 25))
            setPadding(40, 40, 40, 40)
        }
        root.addView(TextView(this).apply {
            text = "🏏"
            textSize = 54f
            gravity = Gravity.CENTER
        })
        root.addView(TextView(this).apply {
            text = "CricketHub"
            textSize = 28f
            setTextColor(Color.WHITE)
            setTypeface(typeface, android.graphics.Typeface.BOLD)
            gravity = Gravity.CENTER
        })
        root.addView(TextView(this).apply {
            text = "Opening CricketHub…"
            textSize = 15f
            setTextColor(Color.rgb(148, 163, 184))
            gravity = Gravity.CENTER
            setPadding(0, 10, 0, 22)
        })
        root.addView(ProgressBar(this).apply { isIndeterminate = true })
        setContentView(root)
    }

    private fun openCricketHub() {
        if (opened || isFinishing) return
        opened = true
        runCatching {
            val customTabs = CustomTabsIntent.Builder()
                .setShowTitle(true)
                .setUrlBarHidingEnabled(true)
                .setShareState(CustomTabsIntent.SHARE_STATE_OFF)
                .build()
            customTabs.intent.addFlags(Intent.FLAG_ACTIVITY_NEW_DOCUMENT)
            customTabs.launchUrl(this, Uri.parse(homeUrl))
        }.onFailure {
            opened = false
            runCatching {
                startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(homeUrl)))
            }.onFailure {
                opened = false
            }
        }
    }

    override fun onResume() {
        super.onResume()
        // If the user returns to the launcher after closing the browser tab,
        // provide a fresh launch rather than leaving an empty native screen.
        if (opened && !isFinishing) {
            window.decorView.postDelayed({
                if (!isFinishing) openCricketHub()
            }, 350)
        }
    }
}
