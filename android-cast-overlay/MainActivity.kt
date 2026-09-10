package io.github.ddagunts.screencast.ui

import android.annotation.SuppressLint
import android.app.Activity
import android.graphics.Color
import android.net.Uri
import android.os.Bundle
import android.view.View
import android.webkit.CookieManager
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.Button
import android.widget.FrameLayout
import android.widget.LinearLayout
import android.widget.ProgressBar
import android.widget.TextView
import androidx.activity.ComponentActivity

class MainActivity : ComponentActivity() {
    private lateinit var webView: WebView
    private lateinit var statusOverlay: LinearLayout
    private lateinit var statusTitle: TextView
    private lateinit var statusDetail: TextView
    private lateinit var progress: ProgressBar
    private lateinit var retryButton: Button
    private lateinit var browserButton: Button

    private val homeUrl = "https://crickethub-vibe-coder22.vercel.app/"
    private var pageStarted = false
    private var pageFinished = false
    private var fatalShown = false

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        window.statusBarColor = Color.rgb(5, 14, 25)
        window.navigationBarColor = Color.rgb(5, 14, 25)

        val root = FrameLayout(this).apply { setBackgroundColor(Color.rgb(5, 14, 25)) }
        setContentView(root)

        // Keep the native UI visible until WebView has definitely reported a successful
        // main-frame load. This avoids ever presenting a silent black screen.
        statusOverlay = createStatusOverlay()
        root.addView(statusOverlay, FrameLayout.LayoutParams(-1, -1))

        try {
            webView = WebView(applicationContext).also { view ->
                // Re-parent the WebView onto the Activity after constructing it with the
                // application context. This avoids device-specific Activity/WebView surface
                // initialization failures while retaining the Activity lifecycle.
                configureWebView(view)
            }
            root.addView(webView, 0, FrameLayout.LayoutParams(-1, -1))
            statusOverlay.bringToFront()
            loadHome()
        } catch (t: Throwable) {
            showFatalError("CricketHub could not start", "Android WebView failed to initialize. Use Retry to try again.")
        }
    }

    @SuppressLint("SetJavaScriptEnabled")
    private fun configureWebView(view: WebView) {
        view.setBackgroundColor(Color.rgb(5, 14, 25))
        view.visibility = View.VISIBLE
        view.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            databaseEnabled = true
            mediaPlaybackRequiresUserGesture = false
            loadsImagesAutomatically = true
            blockNetworkImage = false
            allowFileAccess = false
            allowContentAccess = true
            mixedContentMode = WebSettings.MIXED_CONTENT_COMPATIBILITY_MODE
            cacheMode = WebSettings.LOAD_DEFAULT
            userAgentString = "$userAgentString CricketHubAndroid/1.4"
        }
        CookieManager.getInstance().setAcceptCookie(true)
        CookieManager.getInstance().setAcceptThirdPartyCookies(view, true)

        view.webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(v: WebView, request: WebResourceRequest): Boolean {
                return handleUrl(request.url.toString())
            }

            override fun shouldOverrideUrlLoading(v: WebView, url: String): Boolean {
                return handleUrl(url)
            }

            override fun onPageStarted(v: WebView, url: String, favicon: android.graphics.Bitmap?) {
                pageStarted = true
                pageFinished = false
                showLoading("Starting CricketHub…", "Loading CricketHub")
            }

            override fun onPageFinished(v: WebView, url: String) {
                pageFinished = true
                // Do not use DOM-size heuristics: a perfectly valid Next.js page can be
                // visually rendered before/after its DOM reaches an arbitrary size.
                statusOverlay.postDelayed({
                    if (!fatalShown && pageFinished && !isFinishing) {
                        statusOverlay.visibility = View.GONE
                        v.visibility = View.VISIBLE
                        v.invalidate()
                    }
                }, 500)
            }

            override fun onReceivedError(v: WebView, request: WebResourceRequest, error: WebResourceError) {
                if (request.isForMainFrame) {
                    showError("CricketHub could not load", error.description?.toString() ?: "Network error while loading CricketHub.")
                }
            }
        }
    }

    private fun handleUrl(url: String): Boolean {
        if (url.startsWith("crickethub://cast", ignoreCase = true)) {
            try {
                val intent = android.content.Intent(this, Class.forName("io.github.ddagunts.screencast.ui.CricketHubCastActivity"))
                intent.data = Uri.parse(url)
                startActivity(intent)
            } catch (_: Throwable) {
                showError("Cast helper unavailable", "The integrated Cast feature could not be opened in this build.")
            }
            return true
        }
        return false
    }

    private fun loadHome() {
        fatalShown = false
        pageStarted = false
        pageFinished = false
        retryButton.visibility = View.GONE
        browserButton.visibility = View.GONE
        progress.visibility = View.VISIBLE
        statusOverlay.visibility = View.VISIBLE
        showLoading("Starting CricketHub…", "Loading CricketHub")
        webView.loadUrl(homeUrl)
    }

    private fun createStatusOverlay(): LinearLayout {
        val box = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            gravity = android.view.Gravity.CENTER
            setPadding(40, 40, 40, 40)
            setBackgroundColor(Color.rgb(5, 14, 25))
        }
        val logo = TextView(this).apply {
            text = "🏏"
            textSize = 52f
            gravity = android.view.Gravity.CENTER
        }
        statusTitle = TextView(this).apply {
            textSize = 24f
            setTextColor(Color.WHITE)
            setTypeface(typeface, android.graphics.Typeface.BOLD)
            gravity = android.view.Gravity.CENTER
        }
        statusDetail = TextView(this).apply {
            textSize = 14f
            setTextColor(Color.rgb(148, 163, 184))
            gravity = android.view.Gravity.CENTER
            setPadding(0, 10, 0, 24)
        }
        progress = ProgressBar(this).apply { isIndeterminate = true }
        retryButton = Button(this).apply {
            text = "Retry"
            setOnClickListener { loadHome() }
            visibility = View.GONE
        }
        browserButton = Button(this).apply {
            text = "Open in browser"
            setOnClickListener {
                try { startActivity(android.content.Intent(android.content.Intent.ACTION_VIEW, Uri.parse(homeUrl))) } catch (_: Throwable) {}
            }
            visibility = View.GONE
        }
        box.addView(logo, LinearLayout.LayoutParams(-1, -2))
        box.addView(statusTitle, LinearLayout.LayoutParams(-1, -2))
        box.addView(statusDetail, LinearLayout.LayoutParams(-1, -2))
        box.addView(progress, LinearLayout.LayoutParams(-2, -2))
        box.addView(retryButton, LinearLayout.LayoutParams(-1, -2).apply { topMargin = 18 })
        box.addView(browserButton, LinearLayout.LayoutParams(-1, -2))
        return box
    }

    private fun showLoading(title: String, detail: String) {
        fatalShown = false
        statusTitle.text = title
        statusDetail.text = detail
        progress.visibility = View.VISIBLE
        retryButton.visibility = View.GONE
        browserButton.visibility = View.GONE
        statusOverlay.visibility = View.VISIBLE
        statusOverlay.bringToFront()
    }

    private fun showError(title: String, detail: String) {
        if (isFinishing) return
        fatalShown = true
        statusTitle.text = title
        statusDetail.text = detail
        progress.visibility = View.GONE
        retryButton.visibility = View.VISIBLE
        browserButton.visibility = View.VISIBLE
        statusOverlay.visibility = View.VISIBLE
        statusOverlay.bringToFront()
    }

    private fun showFatalError(title: String, detail: String) {
        fatalShown = true
        statusTitle.text = title
        statusDetail.text = detail
        progress.visibility = View.GONE
        retryButton.visibility = View.VISIBLE
        browserButton.visibility = View.VISIBLE
        statusOverlay.visibility = View.VISIBLE
        statusOverlay.bringToFront()
    }

    override fun onBackPressed() {
        if (::webView.isInitialized && webView.canGoBack()) webView.goBack() else super.onBackPressed()
    }

    override fun onDestroy() {
        if (::webView.isInitialized) {
            webView.stopLoading()
            webView.webViewClient = null
            webView.destroy()
        }
        super.onDestroy()
    }
}
