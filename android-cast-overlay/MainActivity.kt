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
    private lateinit var statusOverlay: View
    private lateinit var statusTitle: TextView
    private lateinit var statusDetail: TextView
    private lateinit var progress: ProgressBar
    private val handler = Handler(Looper.getMainLooper())
    private val homeUrl = "https://crickethub-vibe-coder22.vercel.app/"
    private var pageCommitted = false
    private var fallbackOpened = false

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
            // Keep the diagnostic/loading layer above WebView until the page has
            // actually committed. This prevents a renderer that fails early from
            // leaving the user with an unexplained black surface.
            statusOverlay.bringToFront()
        } catch (t: Throwable) {
            showFatalError(t)
        }

        setContentView(root)
        if (::webView.isInitialized) {
            loadHome()
        }
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
            userAgentString = "$userAgentString CricketHubAndroid/1.1"
        }
        CookieManager.getInstance().setAcceptCookie(true)
        CookieManager.getInstance().setAcceptThirdPartyCookies(webView, true)
        webView.webChromeClient = object : WebChromeClient() {
            override fun onConsoleMessage(message: android.webkit.ConsoleMessage): Boolean {
                return true
            }
        }
        webView.webViewClient = object : WebViewClient() {
            override fun onPageStarted(view: WebView, url: String, favicon: android.graphics.Bitmap?) {
                pageCommitted = false
                showLoading("Opening CricketHub…", "Connecting securely to the CricketHub website")
                armRenderTimeout()
            }

            override fun onPageCommitVisible(view: WebView, url: String) {
                pageCommitted = true
                showWebContent()
                // Verify that the renderer actually produced a document instead
                // of committing an empty/black page.
                handler.postDelayed({ verifyRenderedPage() }, 1200)
            }

            override fun onPageFinished(view: WebView, url: String) {
                // Some Android WebView versions don't reliably invoke
                // onPageCommitVisible. Give them a safe secondary success path.
                if (!pageCommitted) {
                    pageCommitted = true
                    showWebContent()
                    handler.postDelayed({ verifyRenderedPage() }, 800)
                }
            }

            override fun onReceivedError(view: WebView, request: WebResourceRequest, error: WebResourceError) {
                if (request.isForMainFrame) showError("CricketHub couldn't load", error.description?.toString() ?: "Network error")
            }

            override fun onReceivedHttpError(view: WebView, request: WebResourceRequest, errorResponse: android.webkit.WebResourceResponse) {
                if (request.isForMainFrame && errorResponse.statusCode >= 400) {
                    showError("CricketHub returned an error", "HTTP ${errorResponse.statusCode}")
                }
            }

            override fun onRenderProcessGone(view: WebView, detail: RenderProcessGoneDetail): Boolean {
                showError("Android WebView stopped", "The page renderer stopped unexpectedly. You can reopen CricketHub safely.")
                return true
            }

            override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean = handleUrl(request.url.toString())

            @Deprecated("Deprecated by Android")
            override fun shouldOverrideUrlLoading(view: WebView, url: String): Boolean = handleUrl(url)
        }
    }

    private fun loadHome() {
        fallbackOpened = false
        pageCommitted = false
        showLoading("Starting CricketHub…", "Loading the full CricketHub website")
        webView.loadUrl(homeUrl)
        armRenderTimeout()
    }

    private fun armRenderTimeout() {
        handler.removeCallbacksAndMessages(RENDER_TIMEOUT_TOKEN)
        handler.postDelayed({
            if (!pageCommitted && !isFinishing) {
                showError("CricketHub is taking too long", "The Android web renderer did not finish loading. Try again or open the same site in your browser.")
            }
        }, 12000)
    }

    private fun verifyRenderedPage() {
        if (!::webView.isInitialized || isFinishing) return
        webView.evaluateJavascript("(document.body && document.body.innerText ? document.body.innerText.length : 0).toString()") { result ->
            val length = result?.trim('"')?.toIntOrNull() ?: 0
            if (length >= 20) {
                showWebContent()
            } else if (!fallbackOpened) {
                showError("CricketHub page is blank", "The website loaded without visible content in Android WebView.")
            }
        }
    }

    private fun createStatusOverlay(): View {
        val box = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER
            setBackgroundColor(Color.rgb(5, 14, 25))
            setPadding(dp(28), dp(28), dp(28), dp(28))
        }
        val logo = TextView(this).apply {
            text = "🏏"
            textSize = 58f
            gravity = Gravity.CENTER
        }
        val title = TextView(this).apply {
            text = "Starting CricketHub"
            textSize = 28f
            typeface = Typeface.DEFAULT_BOLD
            setTextColor(Color.WHITE)
            gravity = Gravity.CENTER
        }
        statusTitle = title
        val detail = TextView(this).apply {
            text = "Loading the full CricketHub website"
            textSize = 14f
            setTextColor(Color.rgb(148, 163, 184))
            gravity = Gravity.CENTER
            setPadding(0, dp(8), 0, dp(18))
        }
        statusDetail = detail
        progress = ProgressBar(this)
        box.addView(logo, lp())
        box.addView(title, lp())
        box.addView(detail, lp())
        box.addView(progress, lp())
        return box
    }

    private fun showLoading(title: String, detail: String) {
        statusTitle.text = title
        statusDetail.text = detail
        progress.visibility = View.VISIBLE
        statusOverlay.visibility = View.VISIBLE
        statusOverlay.bringToFront()
    }

    private fun showWebContent() {
        handler.removeCallbacksAndMessages(RENDER_TIMEOUT_TOKEN)
        statusOverlay.visibility = View.GONE
        webView.visibility = View.VISIBLE
    }

    private fun showError(title: String, detail: String) {
        handler.removeCallbacksAndMessages(RENDER_TIMEOUT_TOKEN)
        progress.visibility = View.GONE
        statusTitle.text = title
        statusDetail.text = detail
        statusOverlay.visibility = View.VISIBLE
        statusOverlay.bringToFront()
        addErrorButtonsIfNeeded()
    }

    private fun showFatalError(t: Throwable) {
        statusTitle.text = "CricketHub couldn't start"
        statusDetail.text = "Android WebView could not be created. You can still open CricketHub in your browser."
        progress.visibility = View.GONE
        statusOverlay.visibility = View.VISIBLE
        addErrorButtonsIfNeeded()
    }

    private var errorButtonsAdded = false
    private fun addErrorButtonsIfNeeded() {
        if (errorButtonsAdded || statusOverlay !is LinearLayout) return
        errorButtonsAdded = true
        val box = statusOverlay as LinearLayout
        val retry = Button(this).apply {
            text = "Retry"
            isAllCaps = false
            setTextColor(Color.rgb(5, 14, 25))
            setBackgroundColor(Color.rgb(34, 197, 94))
            setOnClickListener {
                errorButtonsAdded = false
                removeErrorButtons(box)
                if (::webView.isInitialized) loadHome() else recreate()
            }
        }
        val browser = Button(this).apply {
            text = "Open in browser"
            isAllCaps = false
            setOnClickListener { openBrowser() }
        }
        box.addView(retry, LinearLayout.LayoutParams(dp(220), dp(52)).apply { topMargin = dp(18) })
        box.addView(browser, LinearLayout.LayoutParams(dp(220), dp(52)).apply { topMargin = dp(8) })
    }

    private fun removeErrorButtons(box: LinearLayout) {
        while (box.childCount > 4) box.removeViewAt(box.childCount - 1)
    }

    private fun openBrowser() {
        fallbackOpened = true
        runCatching { startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(homeUrl))) }
            .onFailure { Toast.makeText(this, "No browser is available", Toast.LENGTH_SHORT).show() }
    }

    private fun handleUrl(raw: String): Boolean {
        val uri = runCatching { Uri.parse(raw) }.getOrNull() ?: return false
        if (uri.scheme.equals("crickethub", true) && uri.host.equals("cast", true)) {
            val url = uri.getQueryParameter("url").orEmpty()
            val name = uri.getQueryParameter("name") ?: "CricketHub"
            if (url.isBlank()) Toast.makeText(this, "No player URL was supplied", Toast.LENGTH_SHORT).show()
            else startActivity(Intent(this, CricketHubCastActivity::class.java).apply {
                data = Uri.parse("crickethub://cast?url=${Uri.encode(url)}&name=${Uri.encode(name)}")
            })
            return true
        }
        return !(uri.scheme.equals("http", true) || uri.scheme.equals("https", true))
    }

    private fun dp(value: Int) = (value * resources.displayMetrics.density).toInt()
    private fun lp() = LinearLayout.LayoutParams(-1, LinearLayout.LayoutParams.WRAP_CONTENT)

    @Deprecated("Deprecated by Android")
    override fun onBackPressed() {
        if (::webView.isInitialized && webView.canGoBack()) webView.goBack() else super.onBackPressed()
    }

    override fun onDestroy() {
        handler.removeCallbacksAndMessages(null)
        if (::webView.isInitialized) {
            webView.stopLoading()
            webView.destroy()
        }
        super.onDestroy()
    }

    companion object {
        private val RENDER_TIMEOUT_TOKEN = Any()
    }
}
