package io.github.ddagunts.screencast.ui

import android.graphics.Color
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
import org.mozilla.geckoview.GeckoRuntimeSettings
import org.mozilla.geckoview.GeckoSession
import org.mozilla.geckoview.GeckoView

/** Real in-app CricketHub renderer. No browser or Custom Tabs are used. */
class MainActivity : ComponentActivity() {
    companion object {
        private const val HOME_URL = "https://crickethub-vibe-coder22.vercel.app/"
        @Volatile private var runtime: GeckoRuntime? = null
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
        window.setSoftInputMode(android.view.WindowManager.LayoutParams.SOFT_INPUT_ADJUST_RESIZE)

        val root = FrameLayout(this).apply { setBackgroundColor(Color.rgb(5, 14, 25)) }

        geckoView = GeckoView(this).apply {
            // SurfaceView is the default GeckoView backend. TextureView is safer for
            // embedded-app composition and avoids SurfaceView black-screen issues on
            // some Android 14/15/16 vendor devices.
            setViewBackend(GeckoView.BACKEND_TEXTURE_VIEW)
            isFocusable = true
            isFocusableInTouchMode = true
        }
        root.addView(geckoView, FrameLayout.LayoutParams(-1, -1))

        loading = ProgressBar(this).apply {
            isIndeterminate = true
            visibility = View.VISIBLE
        }
        root.addView(loading, FrameLayout.LayoutParams(64, 64).apply { gravity = Gravity.CENTER })

        errorText = TextView(this).apply {
            text = "CricketHub is loading…"
            textSize = 15f
            setTextColor(Color.WHITE)
            setPadding(40, 40, 40, 40)
            gravity = Gravity.CENTER
            visibility = View.GONE
        }
        root.addView(errorText, FrameLayout.LayoutParams(-1, -1))
        setContentView(root)

        try {
            val rt = runtime ?: synchronized(MainActivity::class.java) {
                runtime ?: GeckoRuntime.create(
                    applicationContext,
                    GeckoRuntimeSettings.Builder()
                        .javaScriptEnabled(true)
                        .consoleOutput(true)
                        .build()
                ).also { runtime = it }
            }

            session = GeckoSession()
            session.setContentDelegate(object : GeckoSession.ContentDelegate {
                override fun onFirstComposite(session: GeckoSession) {
                    loading?.visibility = View.GONE
                    errorText?.visibility = View.GONE
                }

                override fun onCrash(session: GeckoSession) {
                    loading?.visibility = View.GONE
                    errorText?.text = "CricketHub renderer restarted. Please wait…"
                    errorText?.visibility = View.VISIBLE
                    // GeckoView documents that a crashed content process can be recovered
                    // by reopening the session and loading the page again.
                    session.open(rt)
                    session.loadUri(HOME_URL)
                }
            })

            session.setNavigationDelegate(object : GeckoSession.NavigationDelegate {
                override fun onCanGoBack(session: GeckoSession, value: Boolean) {
                    canGoBack = value
                }

                override fun onLoadRequest(
                    session: GeckoSession,
                    request: GeckoSession.NavigationDelegate.LoadRequest
                ): GeckoResult<AllowOrDeny>? {
                    // Keep the cast deep-link entirely inside the app. Never hand it to
                    // Chrome/Custom Tabs.
                    if (request.uri.startsWith("crickethub://cast", ignoreCase = true)) {
                        val castUri = android.net.Uri.parse(request.uri)
                        runCatching {
                            startActivity(android.content.Intent(
                                this@MainActivity,
                                Class.forName("io.github.ddagunts.screencast.CricketHubCastActivity")
                            ).apply { data = castUri })
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
                    if (!success) {
                        errorText?.text = "CricketHub could not load. Check your internet connection."
                        errorText?.visibility = View.VISIBLE
                    }
                }
            })

            // The official GeckoView embedding order is: open runtime/session, attach
            // the session to GeckoView, then load the URI.
            session.open(rt)
            geckoView.setSession(session)
            session.loadUri(HOME_URL)
        } catch (t: Throwable) {
            loading?.visibility = View.GONE
            errorText?.text = "CricketHub failed to start: ${t.javaClass.simpleName}"
            errorText?.visibility = View.VISIBLE
        }
    }

    override fun onBackPressed() {
        if (::session.isInitialized && canGoBack) session.goBack() else super.onBackPressed()
    }

    override fun onDestroy() {
        if (::session.isInitialized) {
            runCatching { session.close() }
        }
        super.onDestroy()
    }
}
