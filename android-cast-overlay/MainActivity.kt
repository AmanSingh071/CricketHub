package io.github.ddagunts.screencast.ui

import android.annotation.SuppressLint
import android.content.Intent
import android.graphics.Color
import android.graphics.Typeface
import android.net.Uri
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.view.Gravity
import android.view.View
import android.webkit.CookieManager
import android.webkit.RenderProcessGoneDetail
import android.webkit.WebChromeClient
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
import android.widget.Toast
import androidx.activity.ComponentActivity
import io.github.ddagunts.screencast.CricketHubCastActivity

class MainActivity : ComponentActivity() {
    private lateinit var webView: WebView
    private lateinit var statusOverlay: LinearLayout
    private lateinit var statusTitle: TextView
    private lateinit var statusDetail: TextView
    private lateinit var progress: ProgressBar
    private val handler = Handler(Looper.getMainLooper())
    private val homeUrl = "https://crickethub-chi.vercel.app/"
    private var pageCommitted = false
    private var pageVerified = false
    private var errorButtonsAdded = false

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        window.statusBarColor = Color.rgb(5, 14, 25)
        window.navigationBarColor = Color.rgb(5, 14, 25)

        val root = FrameLayout(this).apply { setBackgroundColor(Color.rgb(5, 14, 25)) }
        statusOverlay = createStatusOverlay()
        root.addView(statusOverlay, FrameLayout.LayoutParams(-1, -1))

        try {
            webView = WebView(this)
            configureWebView()
            root.addView(webView, FrameLayout.LayoutParams(-1, -1))
            statusOverlay.bringToFront()
        } catch (t: Throwable) {
            showFatalError()
        }

        setContentView(root)
        if (::webView.isInitialized) loadHome()
    }

    @SuppressLint("SetJavaScriptEnabled")
    private fun configureWebView() {
        webView.setBackgroundColor(Color.rgb(5, 14, 25))
        webView.setLayerType(View.LAYER_TYPE_HARDWARE, null)
        webView.visibility = View.VISIBLE
        webView.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            databaseEnabled = true
            mediaPlaybackRequiresUserGesture = false
            javaScriptCanOpenWindowsAutomatically = true
            setSupportMultipleWindows(false)
            loadWithOverviewMode = false
            useWideViewPort = true
            builtInZoomControls = false
            displayZoomControls = false
            cacheMode = WebSettings.LOAD_DEFAULT
            mixedContentMode = WebSettings.MIXED_CONTENT_COMPATIBILITY_MODE
            allowFileAccess = false
            allowContentAccess = true
            userAgentString = "$userAgentString CricketHubAndroid/1.2"
        }
        CookieManager.getInstance().setAcceptCookie(true)
        CookieManager.getInstance().setAcceptThirdPartyCookies(webView, true)
        webView.webChromeClient = WebChromeClient()
        webView.webViewClient = object : WebViewClient() {
            override fun onPageStarted(view: WebView, url: String, favicon: android.graphics.Bitmap?) {
                pageCommitted = false
                pageVerified = false
                showLoading("Opening CricketHub…", "Connecting securely to CricketHub")
                armRenderTimeout()
            }

            override fun onPageCommitVisible(view: WebView, url: String) {
                pageCommitted = true
                scheduleVerification(300)
            }

            override fun onPageFinished(view: WebView, url: String) {
                pageCommitted = true
                scheduleVerification(300)
            }

            override fun onReceivedError(view: WebView, request: WebResourceRequest, error: WebResourceError) {
                if (request.isForMainFrame) showError("CricketHub couldn't load", error.description?.toString() ?: "Network error")
            }

            override fun onReceivedHttpError(view: WebView, request: WebResourceRequest, errorResponse: android.webkit.WebResourceResponse) {
                if (request.isForMainFrame && errorResponse.statusCode >= 400) showError("CricketHub returned an error", "HTTP ${errorResponse.statusCode}")
            }

            override fun onRenderProcessGone(view: WebView, detail: RenderProcessGoneDetail): Boolean {
                showError("Android WebView stopped", "The page renderer stopped unexpectedly. Tap Retry to restart it safely.")
                return true
            }

            override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean = handleUrl(request.url.toString())

            @Deprecated("Deprecated by Android")
            override fun shouldOverrideUrlLoading(view: WebView, url: String): Boolean = handleUrl(url)
        }
    }

    private fun loadHome() {
        pageCommitted = false
        pageVerified = false
        errorButtonsAdded = false
        removeErrorButtons()
        showLoading("Starting CricketHub…", "Loading the full CricketHub website")
        webView.loadUrl(homeUrl)
        armRenderTimeout()
    }

    private fun scheduleVerification(delay: Long) {
        handler.postDelayed({ verifyRenderedPage() }, delay)
    }

    private fun armRenderTimeout() {
        handler.removeCallbacks(RENDER_TIMEOUT)
        handler.postDelayed({
            if (!pageVerified && !isFinishing) {
                showError(
                    if (pageCommitted) "CricketHub loaded but stayed blank" else "CricketHub is taking too long",
                    if (pageCommitted) "Android WebView received the page but produced no visible document. Tap Retry or open the site in your browser." else "The Android web renderer did not finish loading. Tap Retry or open the site in your browser."
                )
            }
        }, 12000)
    }

    private fun verifyRenderedPage() {
        if (!::webView.isInitialized || isFinishing || pageVerified) return
        webView.evaluateJavascript("(function(){var b=document.body;return JSON.stringify({ready:document.readyState,text:b?b.innerText.length:0,html:b?b.innerHTML.length:0,title:document.title||''});})()") { raw ->
            val value = raw.orEmpty()
            val text = Regex("\\\"text\\\":(\\d+)").find(value)?.groupValues?.get(1)?.toIntOrNull() ?: 0
            val html = Regex("\\\"html\\\":(\\d+)").find(value)?.groupValues?.get(1)?.toIntOrNull() ?: 0
            if (text >= 40 || html >= 500) {
                pageVerified = true
                handler.removeCallbacks(RENDER_TIMEOUT)
                statusOverlay.visibility = View.GONE
                webView.visibility = View.VISIBLE
            } else if (pageCommitted) {
                handler.postDelayed({ verifyRenderedPage() }, 800)
            }
        }
    }

    private fun createStatusOverlay(): LinearLayout {
        val box = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER
            setBackgroundColor(Color.rgb(5, 14, 25))
            setPadding(dp(28), dp(28), dp(28), dp(28))
        }
        val logo = TextView(this).apply { text = "🏏"; textSize = 58f; gravity = Gravity.CENTER }
        val title = TextView(this).apply { text = "Starting CricketHub"; textSize = 28f; typeface = Typeface.DEFAULT_BOLD; setTextColor(Color.WHITE); gravity = Gravity.CENTER }
        statusTitle = title
        val detail = TextView(this).apply { text = "Loading the full CricketHub website"; textSize = 14f; setTextColor(Color.rgb(148, 163, 184)); gravity = Gravity.CENTER; setPadding(0, dp(8), 0, dp(18)) }
        statusDetail = detail
        progress = ProgressBar(this)
        box.addView(logo, lp()); box.addView(title, lp()); box.addView(detail, lp()); box.addView(progress, lp())
        return box
    }

    private fun showLoading(title: String, detail: String) {
        statusTitle.text = title
        statusDetail.text = detail
        progress.visibility = View.VISIBLE
        statusOverlay.visibility = View.VISIBLE
        statusOverlay.bringToFront()
    }

    private fun showError(title: String, detail: String) {
        handler.removeCallbacks(RENDER_TIMEOUT)
        progress.visibility = View.GONE
        statusTitle.text = title
        statusDetail.text = detail
        statusOverlay.visibility = View.VISIBLE
        statusOverlay.bringToFront()
        addErrorButtonsIfNeeded()
    }

    private fun showFatalError() {
        progress.visibility = View.GONE
        statusTitle.text = "CricketHub couldn't start"
        statusDetail.text = "Android WebView could not be created. You can still open CricketHub in your browser."
        statusOverlay.visibility = View.VISIBLE
        addErrorButtonsIfNeeded()
    }

    private fun addErrorButtonsIfNeeded() {
        if (errorButtonsAdded) return
        errorButtonsAdded = true
        val retry = Button(this).apply {
            text = "Retry"
            isAllCaps = false
            setTextColor(Color.rgb(5, 14, 25))
            setBackgroundColor(Color.rgb(34, 197, 94))
            setOnClickListener { loadHome() }
        }
        val browser = Button(this).apply { text = "Open in browser"; isAllCaps = false; setOnClickListener { openBrowser() } }
        statusOverlay.addView(retry, LinearLayout.LayoutParams(dp(220), dp(52)).apply { topMargin = dp(18) })
        statusOverlay.addView(browser, LinearLayout.LayoutParams(dp(220), dp(52)).apply { topMargin = dp(8) })
    }

    private fun removeErrorButtons() { while (statusOverlay.childCount > 4) statusOverlay.removeViewAt(statusOverlay.childCount - 1) }

    private fun openBrowser() {
        runCatching { startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(homeUrl))) }
            .onFailure { Toast.makeText(this, "No browser is available", Toast.LENGTH_SHORT).show() }
    }

    private fun handleUrl(raw: String): Boolean {
        val uri = runCatching { Uri.parse(raw) }.getOrNull() ?: return false
        if (uri.scheme.equals("crickethub", true) && uri.host.equals("cast", true)) {
            val url = uri.getQueryParameter("url").orEmpty()
            val name = uri.getQueryParameter("name") ?: "CricketHub"
            if (url.isBlank()) Toast.makeText(this, "No player URL was supplied", Toast.LENGTH_SHORT).show()
            else startActivity(Intent(this, CricketHubCastActivity::class.java).apply { data = Uri.parse("crickethub://cast?url=${Uri.encode(url)}&name=${Uri.encode(name)}") })
            return true
        }
        return !(uri.scheme.equals("http", true) || uri.scheme.equals("https", true))
    }

    private fun dp(value: Int) = (value * resources.displayMetrics.density).toInt()
    private fun lp() = LinearLayout.LayoutParams(-1, LinearLayout.LayoutParams.WRAP_CONTENT)

    @Deprecated("Deprecated by Android")
    override fun onBackPressed() { if (::webView.isInitialized && webView.canGoBack()) webView.goBack() else super.onBackPressed() }

    override fun onDestroy() {
        handler.removeCallbacksAndMessages(null)
        if (::webView.isInitialized) { webView.stopLoading(); webView.destroy() }
        super.onDestroy()
    }

    companion object { private val RENDER_TIMEOUT = Any() }
}
