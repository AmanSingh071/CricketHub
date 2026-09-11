package io.github.ddagunts.screencast.ui

import android.annotation.SuppressLint
import android.graphics.Color
import android.net.Uri
import android.os.Bundle
import android.view.View
import android.webkit.CookieManager
import android.webkit.WebChromeClient
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.FrameLayout
import android.widget.ProgressBar
import android.widget.TextView
import androidx.activity.ComponentActivity

/**
 * Native Android app shell. The existing CricketHub site is rendered directly in the
 * app's WebView; Chrome/Custom Tabs are never used.
 *
 * Important: do not inspect WebView pixels with View.draw(Canvas). Hardware accelerated
 * WebView content is rendered by a separate surface and draw() can legitimately appear
 * black even while the user can see the page. The old implementation used that false
 * signal and could replace a working page with a black error screen.
 */
class MainActivity : ComponentActivity() {
    companion object {
        private const val HOME_URL = "https://crickethub-vibe-coder22.vercel.app/"
    }

    private lateinit var webView: WebView
    private lateinit var loading: ProgressBar
    private lateinit var errorText: TextView

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(state: Bundle?) {
        super.onCreate(state)
        window.statusBarColor = Color.rgb(5, 14, 25)
        window.navigationBarColor = Color.rgb(5, 14, 25)
        window.setSoftInputMode(android.view.WindowManager.LayoutParams.SOFT_INPUT_ADJUST_RESIZE)

        val root = FrameLayout(this).apply {
            setBackgroundColor(Color.rgb(5, 14, 25))
        }

        webView = WebView(this).apply {
            setBackgroundColor(Color.rgb(5, 14, 25))
            setLayerType(View.LAYER_TYPE_HARDWARE, null)
            isFocusable = true
            isFocusableInTouchMode = true

            settings.apply {
                javaScriptEnabled = true
                domStorageEnabled = true
                databaseEnabled = true
                mediaPlaybackRequiresUserGesture = false
                allowFileAccess = true
                allowContentAccess = true
                javaScriptCanOpenWindowsAutomatically = true
                setSupportMultipleWindows(false)
                cacheMode = WebSettings.LOAD_DEFAULT
                mixedContentMode = WebSettings.MIXED_CONTENT_COMPATIBILITY_MODE
                userAgentString = userAgentString + " CricketHubAndroid/1.0"
            }

            CookieManager.getInstance().setAcceptCookie(true)
            CookieManager.getInstance().setAcceptThirdPartyCookies(this, true)

            webChromeClient = WebChromeClient()
            webViewClient = object : WebViewClient() {
                override fun onPageStarted(view: WebView, url: String, favicon: android.graphics.Bitmap?) {
                    loading.visibility = View.VISIBLE
                    errorText.visibility = View.GONE
                }

                override fun onPageFinished(view: WebView, url: String) {
                    loading.visibility = View.GONE
                    errorText.visibility = View.GONE
                }

                override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean {
                    return handleInternalUrl(request.url)
                }

                @Suppress("DEPRECATION")
                override fun shouldOverrideUrlLoading(view: WebView, url: String): Boolean {
                    return handleInternalUrl(Uri.parse(url))
                }

                override fun onReceivedError(view: WebView, request: WebResourceRequest, error: WebResourceError) {
                    if (request.isForMainFrame) {
                        loading.visibility = View.GONE
                        errorText.text = "CricketHub could not load. Check your internet connection and try again."
                        errorText.visibility = View.VISIBLE
                    }
                }
            }
        }
        root.addView(webView, FrameLayout.LayoutParams(-1, -1))

        loading = ProgressBar(this).apply {
            isIndeterminate = true
            visibility = View.VISIBLE
        }
        root.addView(loading, FrameLayout.LayoutParams(72, 72).apply {
            gravity = android.view.Gravity.CENTER
        })

        errorText = TextView(this).apply {
            text = "CricketHub is loading…"
            textSize = 15f
            setTextColor(Color.WHITE)
            gravity = android.view.Gravity.CENTER
            setPadding(48, 48, 48, 48)
            visibility = View.GONE
        }
        root.addView(errorText, FrameLayout.LayoutParams(-1, -1))

        setContentView(root)

        if (state == null) {
            webView.loadUrl(HOME_URL)
        } else {
            webView.restoreState(state)
        }
    }

    private fun handleInternalUrl(uri: Uri): Boolean {
        if (!uri.scheme.equals("crickethub", ignoreCase = true)) return false
        if (!uri.host.equals("cast", ignoreCase = true)) return true

        runCatching {
            startActivity(android.content.Intent(
                this,
                Class.forName("io.github.ddagunts.screencast.CricketHubCastActivity")
            ).apply { data = uri })
        }.onFailure {
            errorText.text = "Cast helper could not start."
            errorText.visibility = View.VISIBLE
        }
        return true
    }

    override fun onBackPressed() {
        if (::webView.isInitialized && webView.canGoBack()) {
            webView.goBack()
        } else {
            super.onBackPressed()
        }
    }

    override fun onSaveInstanceState(outState: Bundle) {
        if (::webView.isInitialized) webView.saveState(outState)
        super.onSaveInstanceState(outState)
    }

    override fun onDestroy() {
        if (::webView.isInitialized) {
            webView.stopLoading()
            webView.webChromeClient = null
            webView.webViewClient = WebViewClient()
            webView.destroy()
        }
        super.onDestroy()
    }
}
