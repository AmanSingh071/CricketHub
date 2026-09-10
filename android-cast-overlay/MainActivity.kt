package io.github.ddagunts.screencast.ui

import android.annotation.SuppressLint
import android.content.Intent
import android.graphics.Color
import android.graphics.Typeface
import android.net.Uri
import android.os.Bundle
import android.view.Gravity
import android.view.View
import android.webkit.CookieManager
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
    private lateinit var loading: View
    private lateinit var errorView: View
    private val homeUrl = "https://crickethub-vibe-coder22.vercel.app/"

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        window.statusBarColor = Color.rgb(5, 14, 25)
        window.navigationBarColor = Color.rgb(5, 14, 25)

        val root = FrameLayout(this).apply { setBackgroundColor(Color.rgb(5, 14, 25)) }
        loading = createLoadingView()
        errorView = createErrorView()
        root.addView(errorView, FrameLayout.LayoutParams(-1, -1))
        root.addView(loading, FrameLayout.LayoutParams(-1, -1))

        webView = WebView(this).apply {
            setBackgroundColor(Color.rgb(5, 14, 25))
            visibility = View.INVISIBLE
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
                override fun onPageStarted(view: WebView, url: String, favicon: android.graphics.Bitmap?) = showLoading()
                override fun onPageFinished(view: WebView, url: String) {
                    webView.visibility = View.VISIBLE
                    loading.visibility = View.GONE
                    errorView.visibility = View.GONE
                }
                override fun onReceivedError(view: WebView, request: WebResourceRequest, error: WebResourceError) {
                    if (request.isForMainFrame) showError()
                }
                override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean = handleUrl(request.url.toString())
                @Deprecated("Deprecated by Android")
                override fun shouldOverrideUrlLoading(view: WebView, url: String): Boolean = handleUrl(url)
            }
        }
        root.addView(webView, FrameLayout.LayoutParams(-1, -1))
        setContentView(root)
        webView.loadUrl(intent?.data?.toString()?.takeIf { it.startsWith("https://crickethub-") } ?: homeUrl)
    }

    private fun createLoadingView(): View {
        val box = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL; gravity = Gravity.CENTER
            setBackgroundColor(Color.rgb(5, 14, 25)); setPadding(dp(28), dp(28), dp(28), dp(28))
        }
        val logo = TextView(this).apply { text = "🏏"; textSize = 58f; gravity = Gravity.CENTER }
        val title = TextView(this).apply { text = "CricketHub"; textSize = 30f; typeface = Typeface.DEFAULT_BOLD; setTextColor(Color.WHITE); gravity = Gravity.CENTER }
        val sub = TextView(this).apply { text = "Loading live cricket…"; textSize = 14f; setTextColor(Color.rgb(148,163,184)); gravity = Gravity.CENTER; setPadding(0,dp(6),0,dp(18)) }
        box.addView(logo, lp()); box.addView(title, lp()); box.addView(sub, lp()); box.addView(ProgressBar(this), lp())
        return box
    }

    private fun createErrorView(): View {
        val box = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL; gravity = Gravity.CENTER; setBackgroundColor(Color.rgb(5,14,25)); setPadding(dp(28),dp(28),dp(28),dp(28)); visibility = View.GONE }
        val icon = TextView(this).apply { text = "⚠️"; textSize = 48f; gravity = Gravity.CENTER }
        val title = TextView(this).apply { text = "CricketHub couldn't load"; textSize = 23f; typeface = Typeface.DEFAULT_BOLD; setTextColor(Color.WHITE); gravity = Gravity.CENTER; setPadding(0,dp(12),0,dp(8)) }
        val detail = TextView(this).apply { text = "Check your internet connection and try again."; textSize = 14f; setTextColor(Color.rgb(148,163,184)); gravity = Gravity.CENTER }
        val retry = Button(this).apply { text = "Retry"; isAllCaps = false; setTextColor(Color.rgb(5,14,25)); setBackgroundColor(Color.rgb(34,197,94)); setOnClickListener { webView.loadUrl(homeUrl) } }
        box.addView(icon,lp()); box.addView(title,lp()); box.addView(detail,lp(16)); box.addView(retry,LinearLayout.LayoutParams(dp(180),dp(52)))
        return box
    }

    private fun showLoading() { loading.visibility = View.VISIBLE; errorView.visibility = View.GONE; webView.visibility = View.INVISIBLE }
    private fun showError() { loading.visibility = View.GONE; webView.visibility = View.INVISIBLE; errorView.visibility = View.VISIBLE }

    private fun handleUrl(raw: String): Boolean {
        val uri = runCatching { Uri.parse(raw) }.getOrNull() ?: return false
        if (uri.scheme.equals("crickethub", true) && uri.host.equals("cast", true)) {
            val url = uri.getQueryParameter("url").orEmpty(); val name = uri.getQueryParameter("name") ?: "CricketHub"
            if (url.isBlank()) Toast.makeText(this,"No player URL was supplied",Toast.LENGTH_SHORT).show()
            else startActivity(Intent(this,CricketHubCastActivity::class.java).apply { data=Uri.parse("crickethub://cast?url=${Uri.encode(url)}&name=${Uri.encode(name)}") })
            return true
        }
        return !(uri.scheme == "http" || uri.scheme == "https")
    }

    private fun dp(value:Int)=(value*resources.displayMetrics.density).toInt()
    private fun lp(bottom:Int=0)=LinearLayout.LayoutParams(-1,LinearLayout.LayoutParams.WRAP_CONTENT).apply { bottomMargin=dp(bottom) }
    @Deprecated("Deprecated by Android") override fun onBackPressed() { if(webView.canGoBack()) webView.goBack() else super.onBackPressed() }
    override fun onDestroy() { webView.stopLoading(); webView.destroy(); super.onDestroy() }
}
