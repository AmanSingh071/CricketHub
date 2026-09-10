package io.github.ddagunts.screencast.ui

import android.annotation.SuppressLint
import android.content.Intent
import android.graphics.Color
import android.net.Uri
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.view.Gravity
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
    private val handler = Handler(Looper.getMainLooper())
    private val homeUrl = "https://crickethub-vibe-coder22.vercel.app/"
    private var pageFinished = false
    private var fatalShown = false

    private val startupTimeout = Runnable {
        if (!pageFinished && !fatalShown && !isFinishing) {
            showError("CricketHub is not responding", "The website did not finish loading. Check your internet connection and tap Retry.")
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        window.statusBarColor = Color.rgb(5, 14, 25)
        window.navigationBarColor = Color.rgb(5, 14, 25)

        val root = FrameLayout(this).apply { setBackgroundColor(Color.rgb(5, 14, 25)) }
        setContentView(root)

        try {
            webView = WebView(this)
            configureWebView()
            root.addView(webView, FrameLayout.LayoutParams(-1, -1))
        } catch (t: Throwable) {
            statusOverlay = createStatusOverlay()
            root.addView(statusOverlay, FrameLayout.LayoutParams(-1, -1))
            showFatalError("CricketHub could not start", "Android WebView failed to initialize. Tap Retry to try again.")
            return
        }

        statusOverlay = createStatusOverlay()
        root.addView(statusOverlay, FrameLayout.LayoutParams(-1, -1))
        statusOverlay.bringToFront()
        loadHome()
    }

    @SuppressLint("SetJavaScriptEnabled")
    private fun configureWebView() {
        webView.setBackgroundColor(Color.rgb(5, 14, 25))
        webView.visibility = View.VISIBLE
        webView.settings.apply {
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
            userAgentString = "$userAgentString CricketHubAndroid/1.5"
        }
        CookieManager.getInstance().setAcceptCookie(true)
        CookieManager.getInstance().setAcceptThirdPartyCookies(webView, true)

        webView.webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean = handleUrl(request.url.toString())
            override fun shouldOverrideUrlLoading(view: WebView, url: String): Boolean = handleUrl(url)

            override fun onPageStarted(view: WebView, url: String, favicon: android.graphics.Bitmap?) {
                pageFinished = false
                fatalShown = false
                showLoading("Starting CricketHub…", "Loading CricketHub")
                armStartupTimeout()
            }

            override fun onPageFinished(view: WebView, url: String) {
                pageFinished = true
                handler.removeCallbacks(startupTimeout)
                // Give Chromium one frame to paint after the main-frame callback. Never run
                // DOM-size checks and never switch the WebView to software rendering.
                view.postDelayed({
                    if (!fatalShown && !isFinishing) {
                        statusOverlay.visibility = View.GONE
                        view.visibility = View.VISIBLE
                        view.requestLayout()
                        view.invalidate()
                    }
                }, 350)
            }

            override fun onReceivedError(view: WebView, request: WebResourceRequest, error: WebResourceError) {
                if (request.isForMainFrame) {
                    handler.removeCallbacks(startupTimeout)
                    showError("CricketHub could not load", error.description?.toString() ?: "Network error while loading CricketHub.")
                }
            }
        }
    }

    private fun armStartupTimeout() {
        handler.removeCallbacks(startupTimeout)
        handler.postDelayed(startupTimeout, 20000)
    }

    private fun handleUrl(url: String): Boolean {
        if (url.startsWith("crickethub://cast", ignoreCase = true)) {
            try {
                val intent = Intent(this, Class.forName("io.github.ddagunts.screencast.ui.CricketHubCastActivity"))
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
        pageFinished = false
        handler.removeCallbacks(startupTimeout)
        showLoading("Starting CricketHub…", "Loading CricketHub")
        webView.visibility = View.VISIBLE
        webView.loadUrl(homeUrl)
        armStartupTimeout()
    }

    private fun createStatusOverlay(): LinearLayout {
        val box = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER
            setPadding(40, 40, 40, 40)
            setBackgroundColor(Color.rgb(5, 14, 25))
        }
        val logo = TextView(this).apply {
            text = "🏏"
            textSize = 52f
            gravity = Gravity.CENTER
        }
        statusTitle = TextView(this).apply {
            textSize = 24f
            setTextColor(Color.WHITE)
            setTypeface(typeface, android.graphics.Typeface.BOLD)
            gravity = Gravity.CENTER
        }
        statusDetail = TextView(this).apply {
            textSize = 14f
            setTextColor(Color.rgb(148, 163, 184))
            gravity = Gravity.CENTER
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
                try { startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(homeUrl))) } catch (_: Throwable) {}
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
        handler.removeCallbacksAndMessages(null)
        if (::webView.isInitialized) {
            webView.stopLoading()
            webView.webViewClient = null
            webView.destroy()
        }
        super.onDestroy()
    }
}
