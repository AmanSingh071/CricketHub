package io.github.ddagunts.screencast.ui

import android.content.Intent
import android.graphics.Color
import android.net.Uri
import android.os.Bundle
import android.view.Gravity
import android.view.View
import android.widget.FrameLayout
import android.widget.ProgressBar
import android.widget.TextView
import androidx.activity.ComponentActivity
import org.mozilla.geckoview.AllowOrDeny
import org.mozilla.geckoview.GeckoResult
import org.mozilla.geckoview.GeckoRuntime
import org.mozilla.geckoview.GeckoSession
import org.mozilla.geckoview.GeckoView

/** Proper in-app CricketHub renderer using Mozilla GeckoView. */
class MainActivity : ComponentActivity() {
    companion object {
        private const val HOME_URL = "https://crickethub-vibe-coder22.vercel.app/"
        private var runtime: GeckoRuntime? = null
    }

    private lateinit var geckoView: GeckoView
    private lateinit var session: GeckoSession
    private var loading: ProgressBar? = null
    private var errorText: TextView? = null
    private var canGoBack = false

    override fun onCreate(state: Bundle?) {
        super.onCreate(state)
        window.statusBarColor = Color.rgb(5, 14, 25)
        window.navigationBarColor = Color.rgb(5, 14, 25)

        val root = FrameLayout(this).apply { setBackgroundColor(Color.rgb(5, 14, 25)) }
        geckoView = GeckoView(this).apply {
            isFocusable = true
            isFocusableInTouchMode = true
        }
        root.addView(geckoView, FrameLayout.LayoutParams(-1, -1))
        loading = ProgressBar(this).apply { isIndeterminate = true }
        root.addView(loading, FrameLayout.LayoutParams(72, 72).apply { gravity = Gravity.CENTER })
        errorText = TextView(this).apply {
            text = "CricketHub could not load. Check your internet connection."
            textSize = 15f
            setTextColor(Color.WHITE)
            setPadding(40, 40, 40, 40)
            gravity = Gravity.CENTER
            visibility = View.GONE
        }
        root.addView(errorText, FrameLayout.LayoutParams(-1, -1))
        setContentView(root)

        try {
            val rt = runtime ?: GeckoRuntime.create(this).also { runtime = it }
            session = GeckoSession()
            session.setContentDelegate(object : GeckoSession.ContentDelegate {})
            session.setNavigationDelegate(object : GeckoSession.NavigationDelegate {
                override fun onCanGoBack(session: GeckoSession, value: Boolean) {
                    canGoBack = value
                }

                override fun onLoadRequest(
                    session: GeckoSession,
                    request: GeckoSession.NavigationDelegate.LoadRequest
                ): GeckoResult<AllowOrDeny>? {
                    val url = request.uri
                    if (url.startsWith("crickethub://cast", ignoreCase = true)) {
                        val castUri = Uri.parse(url)
                        castUri.getQueryParameter("url")?.takeIf { it.isNotBlank() }?.let { playerUrl ->
                            session.loadUri(playerUrl)
                        }
                        runCatching {
                            startActivity(Intent(this@MainActivity, Class.forName("io.github.ddagunts.screencast.CricketHubCastActivity")).apply {
                                data = castUri
                            })
                        }
                        return GeckoResult.deny()
                    }
                    return GeckoResult.allow()
                }
            })
            session.setProgressDelegate(object : GeckoSession.ProgressDelegate {
                override fun onPageStart(session: GeckoSession, url: String) {
                    loading?.visibility = View.VISIBLE
                    errorText?.visibility = View.GONE
                }
                override fun onPageStop(session: GeckoSession, success: Boolean) {
                    loading?.visibility = View.GONE
                    if (!success) errorText?.visibility = View.VISIBLE
                }
            })
            session.open(rt)
            geckoView.setSession(session)
            session.loadUri(HOME_URL)
        } catch (_: Throwable) {
            loading?.visibility = View.GONE
            errorText?.visibility = View.VISIBLE
        }
    }

    override fun onBackPressed() {
        if (::session.isInitialized && canGoBack) session.goBack() else super.onBackPressed()
    }

    override fun onDestroy() {
        if (::session.isInitialized) session.close()
        super.onDestroy()
    }
}
