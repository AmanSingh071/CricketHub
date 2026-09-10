package io.github.ddagunts.screencast.ui

import android.content.Intent
import android.graphics.Color
import android.net.Uri
import android.os.Bundle
import android.view.Gravity
import android.widget.Button
import android.widget.LinearLayout
import android.widget.ProgressBar
import android.widget.TextView
import androidx.activity.ComponentActivity
import androidx.browser.customtabs.CustomTabsIntent

/**
 * CricketHub website host.
 *
 * We intentionally do NOT embed the remote Next.js site in Android WebView.
 * The user's device showed a WebView compositor black-surface failure even
 * after hardware/software renderer changes. Android Custom Tabs uses the
 * device's production Chromium renderer instead, which is the reliable path
 * for this remote website while still keeping the site in the CricketHub app
 * launch flow. The website's crickethub://cast link is routed back into the
 * integrated CastActivity through the manifest intent-filter.
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
            setPadding(40, 40, 40, 40)
            setBackgroundColor(Color.rgb(5, 14, 25))
        }
        val logo = TextView(this).apply {
            text = "🏏"
            textSize = 58f
            gravity = Gravity.CENTER
        }
        val title = TextView(this).apply {
            text = "CricketHub"
            textSize = 28f
            setTextColor(Color.WHITE)
            setTypeface(typeface, android.graphics.Typeface.BOLD)
            gravity = Gravity.CENTER
        }
        val detail = TextView(this).apply {
            text = "Opening CricketHub…"
            textSize = 14f
            setTextColor(Color.rgb(148, 163, 184))
            gravity = Gravity.CENTER
            setPadding(0, 10, 0, 22)
        }
        val progress = ProgressBar(this).apply { isIndeterminate = true }
        val retry = Button(this).apply {
            text = "Open CricketHub"
            setOnClickListener { openCricketHub() }
        }
        root.addView(logo)
        root.addView(title)
        root.addView(detail)
        root.addView(progress)
        root.addView(retry)
        setContentView(root)
    }

    private fun openCricketHub() {
        if (opened || isFinishing) return
        opened = true
        try {
            val intent = CustomTabsIntent.Builder()
                .setToolbarColor(Color.rgb(5, 14, 25))
                .setSecondaryToolbarColor(Color.rgb(5, 14, 25))
                .setShowTitle(false)
                .setUrlBarHidingEnabled(true)
                .setShareState(CustomTabsIntent.SHARE_STATE_OFF)
                .build()
            intent.launchUrl(this, Uri.parse(homeUrl))
            finish()
        } catch (_: Throwable) {
            opened = false
            runCatching { startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(homeUrl))) }
        }
    }
}
