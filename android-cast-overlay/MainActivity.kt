package io.github.ddagunts.screencast.ui

import android.annotation.SuppressLint
import android.content.Intent
import android.graphics.Color
import android.net.Uri
import android.os.Bundle
import android.view.Gravity
import android.view.View
import android.webkit.CookieManager
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.FrameLayout
import android.widget.ProgressBar
import android.widget.TextView
import android.widget.Toast
import androidx.activity.ComponentActivity
import io.github.ddagunts.screencast.CricketHubCastActivity

/**
 * Native CricketHub shell. The complete existing website stays the source of
 * truth for channels, scores and UI; this activity adds a reliable Android
 * WebView and routes the existing Cast button into the built-in cast engine.
 */
class MainActivity : ComponentActivity() {
    private lateinit var webView: WebView
    private lateinit var progress: ProgressBar
    private val homeUrl = "https://crickethub-vibe-coder22.vercel.app/"

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        window.statusBarColor = Color.rgb(5, 14, 25)
        window.navigationBarColor = Color.rgb(5, 14, 25)

        val root = FrameLayout(this).apply { setBackgroundColor(Color.rgb(5, 14, 25)) }
        progress = ProgressBar(this).apply {
            isIndeterminate = true
            setVisibility(View.VISIBLE)
        }

        webView = WebView(this).apply {
            setBackgroundColor(Color.rgb(5, 14, 25))
            settings.apply {
                javaScriptEnabled = true
                domStorageEnabled = true
                databaseEnabled = true
                mediaPlaybackRequiresUserGesture = false
                javaScriptCanOpenWindowsAutomatically = true
                setSupportMultipleWindows(false)
                loadWithOverviewMode = true
                useWideViewPort = true
                builtInZoomControls = false
                displayZoomControls = false
                cacheMode = WebSettings.LOAD_DEFAULT
                mixedContentMode = WebSettings.MIXED_CONTENT_COMPATIBILITY_MODE
                allowFileAccess = false
                allowContentAccess = true
                userAgentString = "$userAgentString CricketHubAndroid/1.0"
            }
            CookieManager.getInstance().setAcceptCookie(true)
            CookieManager.getInstance().setAcceptThirdPartyCookies(this, true)
            webChromeClient = WebChromeClient()
            webViewClient = object : WebViewClient() {
                override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean =
                    handleUrl(request.url.toString())

                @Deprecated("Deprecated in API 24")
                override fun shouldOverrideUrlLoading(view: WebView, url: String): Boolean = handleUrl(url)

                override fun onPageStarted(view: WebView, url: String, favicon: android.graphics.Bitmap?) {
                    progress.setVisibility(View.VISIBLE)
                }

                override fun onPageFinished(view: WebView, url: String) {
                    progress.setVisibility(View.GONE)
                }

                override fun onReceivedError(
                    view: WebView,
                    request: WebResourceRequest,
                    error: android.webkit.WebResourceError,
                ) {
                    if (request.isForMainFrame) progress.setVisibility(View.GONE)
                }
            }
        }

        root.addView(webView, FrameLayout.LayoutParams(-1, -1))
        root.addView(progress, FrameLayout.LayoutParams(dp(42), dp(42), Gravity.CENTER))

        val offline = TextView(this).apply {
            text = "CricketHub\n\nConnection problem. Pull down to retry."
            setTextColor(Color.WHITE)
            textSize = 15f
            gravity = Gravity.CENTER
            setBackgroundColor(Color.rgb(5, 14, 25))
            setVisibility(View.GONE)
            setOnClickListener { webView.reload() }
        }
        root.addView(offline, FrameLayout.LayoutParams(-1, -1))
        setContentView(root)

        webView.settings.setSupportZoom(false)
        webView.loadUrl(intent?.data?.toString()?.takeIf { it.startsWith("https://crickethub-") } ?: homeUrl)
    }

    private fun handleUrl(raw: String): Boolean {
        val uri = runCatching { Uri.parse(raw) }.getOrNull() ?: return false
        if (uri.scheme.equals("crickethub", ignoreCase = true) && uri.host.equals("cast", ignoreCase = true)) {
            val url = uri.getQueryParameter("url").orEmpty()
            val name = uri.getQueryParameter("name") ?: "CricketHub"
            if (url.isBlank()) {
                Toast.makeText(this, "No player URL was supplied", Toast.LENGTH_SHORT).show()
            } else {
                startActivity(Intent(this, CricketHubCastActivity::class.java).apply {
                    data = Uri.parse("crickethub://cast?url=${Uri.encode(url)}&name=${Uri.encode(name)}")
                })
            }
            return true
        }
        if (uri.scheme == "http" || uri.scheme == "https") return false
        return true
    }

    @Deprecated("Deprecated in API 33")
    override fun onBackPressed() {
        if (webView.canGoBack()) webView.goBack() else super.onBackPressed()
    }

    override fun onDestroy() {
        webView.stopLoading()
        webView.destroy()
        super.onDestroy()
    }

    private fun dp(value: Int) = (value * resources.displayMetrics.density).toInt()
}
