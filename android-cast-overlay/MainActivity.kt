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
    private lateinit var overlay: LinearLayout
    private lateinit var title: TextView
    private lateinit var detail: TextView
    private lateinit var progress: ProgressBar
    private lateinit var retry: Button
    private lateinit var browser: Button
    private val handler=Handler(Looper.getMainLooper())
    private val homeUrl="https://crickethub-vibe-coder22.vercel.app/"
    private var finished=false
    private var failed=false
    private val timeout=Runnable { if(!finished&&!failed&&!isFinishing) showError("CricketHub is not responding","The website did not finish loading. Check your internet connection and tap Retry.") }

    override fun onCreate(state:Bundle?) {
        super.onCreate(state)
        window.statusBarColor=Color.rgb(5,14,25)
        window.navigationBarColor=Color.rgb(5,14,25)
        val root=FrameLayout(this).apply{setBackgroundColor(Color.rgb(5,14,25))}
        setContentView(root)
        try {
            webView=WebView(this)
            configureWebView()
            root.addView(webView,FrameLayout.LayoutParams(-1,-1))
        } catch(_:Throwable) {
            overlay=createOverlay(); root.addView(overlay,FrameLayout.LayoutParams(-1,-1)); showFatal("CricketHub could not start","Android WebView failed to initialize. Tap Retry to try again."); return
        }
        overlay=createOverlay(); root.addView(overlay,FrameLayout.LayoutParams(-1,-1)); overlay.bringToFront(); loadHome()
    }

    @SuppressLint("SetJavaScriptEnabled")
    private fun configureWebView() {
        webView.setBackgroundColor(Color.rgb(5,14,25))
        // The phone that exposed the black-surface bug is more reliable with the WebView
        // software layer. Do this from the beginning instead of detecting the surface later.
        webView.setLayerType(View.LAYER_TYPE_SOFTWARE,null)
        webView.settings.apply {
            javaScriptEnabled=true; domStorageEnabled=true; databaseEnabled=true
            mediaPlaybackRequiresUserGesture=false; loadsImagesAutomatically=true; blockNetworkImage=false
            allowFileAccess=false; allowContentAccess=true
            mixedContentMode=WebSettings.MIXED_CONTENT_COMPATIBILITY_MODE
            cacheMode=WebSettings.LOAD_DEFAULT
            userAgentString="$userAgentString CricketHubAndroid/1.7"
        }
        CookieManager.getInstance().setAcceptCookie(true)
        CookieManager.getInstance().setAcceptThirdPartyCookies(webView,true)
        webView.webViewClient=object:WebViewClient() {
            override fun shouldOverrideUrlLoading(v:WebView,r:WebResourceRequest)=handleUrl(r.url.toString())
            override fun shouldOverrideUrlLoading(v:WebView,url:String)=handleUrl(url)
            override fun onPageStarted(v:WebView,url:String,favicon:android.graphics.Bitmap?) { finished=false; failed=false; showLoading("Starting CricketHub…","Loading CricketHub"); armTimeout() }
            override fun onPageFinished(v:WebView,url:String) { finished=true; handler.removeCallbacks(timeout); v.postDelayed({ if(!failed&&!isFinishing){ overlay.visibility=View.GONE; v.invalidate() } },500) }
            override fun onReceivedError(v:WebView,r:WebResourceRequest,e:WebResourceError) { if(r.isForMainFrame){handler.removeCallbacks(timeout);showError("CricketHub could not load",e.description?.toString() ?: "Network error while loading CricketHub.")} }
        }
    }

    private fun armTimeout(){handler.removeCallbacks(timeout);handler.postDelayed(timeout,25000)}

    private fun handleUrl(url:String):Boolean {
        if(url.startsWith("crickethub://cast",true)) {
            try { startActivity(Intent(this,Class.forName("io.github.ddagunts.screencast.CricketHubCastActivity")).apply{data=Uri.parse(url)}) }
            catch(_:Throwable){showError("Cast helper unavailable","The integrated Cast feature could not be opened in this build.")}
            return true
        }
        return false
    }

    private fun loadHome(){
        finished=false; failed=false; handler.removeCallbacks(timeout); showLoading("Starting CricketHub…","Loading CricketHub"); webView.visibility=View.VISIBLE
        webView.setLayerType(View.LAYER_TYPE_SOFTWARE,null)
        webView.loadUrl(homeUrl); armTimeout()
    }

    private fun createOverlay():LinearLayout {
        val box=LinearLayout(this).apply{orientation=LinearLayout.VERTICAL;gravity=Gravity.CENTER;setPadding(40,40,40,40);setBackgroundColor(Color.rgb(5,14,25))}
        val logo=TextView(this).apply{text="🏏";textSize=52f;gravity=Gravity.CENTER}
        title=TextView(this).apply{textSize=24f;setTextColor(Color.WHITE);setTypeface(typeface,android.graphics.Typeface.BOLD);gravity=Gravity.CENTER}
        detail=TextView(this).apply{textSize=14f;setTextColor(Color.rgb(148,163,184));gravity=Gravity.CENTER;setPadding(0,10,0,24)}
        progress=ProgressBar(this).apply{isIndeterminate=true}
        retry=Button(this).apply{text="Retry";setOnClickListener{loadHome()};visibility=View.GONE}
        browser=Button(this).apply{text="Open in browser";setOnClickListener{try{startActivity(Intent(Intent.ACTION_VIEW,Uri.parse(homeUrl)))}catch(_:Throwable){}};visibility=View.GONE}
        box.addView(logo);box.addView(title);box.addView(detail);box.addView(progress);box.addView(retry,LinearLayout.LayoutParams(-1,-2).apply{topMargin=18});box.addView(browser);return box
    }
    private fun showLoading(t:String,d:String){failed=false;title.text=t;detail.text=d;progress.visibility=View.VISIBLE;retry.visibility=View.GONE;browser.visibility=View.GONE;overlay.visibility=View.VISIBLE;overlay.bringToFront()}
    private fun showError(t:String,d:String){if(isFinishing)return;failed=true;title.text=t;detail.text=d;progress.visibility=View.GONE;retry.visibility=View.VISIBLE;browser.visibility=View.VISIBLE;overlay.visibility=View.VISIBLE;overlay.bringToFront()}
    private fun showFatal(t:String,d:String){failed=true;title.text=t;detail.text=d;progress.visibility=View.GONE;retry.visibility=View.VISIBLE;browser.visibility=View.VISIBLE;overlay.visibility=View.VISIBLE}
    override fun onBackPressed(){if(::webView.isInitialized&&webView.canGoBack())webView.goBack()else super.onBackPressed()}
    override fun onDestroy(){handler.removeCallbacksAndMessages(null);if(::webView.isInitialized){webView.stopLoading();webView.destroy()};super.onDestroy()}
}
