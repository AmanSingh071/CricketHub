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
    private val startupTimeout = Runnable { if (!pageFinished && !fatalShown && !isFinishing) showError("CricketHub is not responding", "The website did not finish loading. Check your internet connection and tap Retry.") }
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        window.statusBarColor = Color.rgb(5,14,25); window.navigationBarColor = Color.rgb(5,14,25)
        val root=FrameLayout(this).apply{setBackgroundColor(Color.rgb(5,14,25))}; setContentView(root)
        try { webView=WebView(this); configureWebView(); root.addView(webView,FrameLayout.LayoutParams(-1,-1)) } catch (_:Throwable) { statusOverlay=createStatusOverlay(); root.addView(statusOverlay,FrameLayout.LayoutParams(-1,-1)); showFatalError("CricketHub could not start","Android WebView failed to initialize. Tap Retry to try again."); return }
        statusOverlay=createStatusOverlay(); root.addView(statusOverlay,FrameLayout.LayoutParams(-1,-1)); statusOverlay.bringToFront(); loadHome()
    }
    @SuppressLint("SetJavaScriptEnabled") private fun configureWebView(){
        webView.setBackgroundColor(Color.rgb(5,14,25)); webView.settings.apply{javaScriptEnabled=true;domStorageEnabled=true;databaseEnabled=true;mediaPlaybackRequiresUserGesture=false;loadsImagesAutomatically=true;blockNetworkImage=false;allowFileAccess=false;allowContentAccess=true;mixedContentMode=WebSettings.MIXED_CONTENT_COMPATIBILITY_MODE;cacheMode=WebSettings.LOAD_DEFAULT;userAgentString="$userAgentString CricketHubAndroid/1.5"}; CookieManager.getInstance().setAcceptCookie(true); CookieManager.getInstance().setAcceptThirdPartyCookies(webView,true)
        webView.webViewClient=object:WebViewClient(){
            override fun shouldOverrideUrlLoading(v:WebView,r:WebResourceRequest):Boolean=handleUrl(r.url.toString())
            override fun shouldOverrideUrlLoading(v:WebView,url:String):Boolean=handleUrl(url)
            override fun onPageStarted(v:WebView,url:String,favicon:android.graphics.Bitmap?){pageFinished=false;fatalShown=false;showLoading("Starting CricketHub…","Loading CricketHub");armStartupTimeout()}
            override fun onPageFinished(v:WebView,url:String){pageFinished=true;handler.removeCallbacks(startupTimeout);v.postDelayed({if(!fatalShown&&!isFinishing){statusOverlay.visibility=View.GONE;v.requestLayout();v.invalidate()}},350)}
            override fun onReceivedError(v:WebView,r:WebResourceRequest,e:WebResourceError){if(r.isForMainFrame){handler.removeCallbacks(startupTimeout);showError("CricketHub could not load",e.description?.toString() ?: "Network error while loading CricketHub.")}}
        }
    }
    private fun armStartupTimeout(){handler.removeCallbacks(startupTimeout);handler.postDelayed(startupTimeout,20000)}
    private fun handleUrl(url:String):Boolean{if(url.startsWith("crickethub://cast",true)){try{startActivity(Intent(this,Class.forName("io.github.ddagunts.screencast.ui.CricketHubCastActivity")).apply{data=Uri.parse(url)})}catch(_:Throwable){showError("Cast helper unavailable","The integrated Cast feature could not be opened in this build.")};return true};return false}
    private fun loadHome(){fatalShown=false;pageFinished=false;handler.removeCallbacks(startupTimeout);showLoading("Starting CricketHub…","Loading CricketHub");webView.visibility=View.VISIBLE;webView.loadUrl(homeUrl);armStartupTimeout()}
    private fun createStatusOverlay():LinearLayout{val b=LinearLayout(this).apply{orientation=LinearLayout.VERTICAL;gravity=Gravity.CENTER;setPadding(40,40,40,40);setBackgroundColor(Color.rgb(5,14,25))};val l=TextView(this).apply{text="🏏";textSize=52f;gravity=Gravity.CENTER};statusTitle=TextView(this).apply{textSize=24f;setTextColor(Color.WHITE);setTypeface(typeface,android.graphics.Typeface.BOLD);gravity=Gravity.CENTER};statusDetail=TextView(this).apply{textSize=14f;setTextColor(Color.rgb(148,163,184));gravity=Gravity.CENTER;setPadding(0,10,0,24)};progress=ProgressBar(this).apply{isIndeterminate=true};retryButton=Button(this).apply{text="Retry";setOnClickListener{loadHome()};visibility=View.GONE};browserButton=Button(this).apply{text="Open in browser";setOnClickListener{try{startActivity(Intent(Intent.ACTION_VIEW,Uri.parse(homeUrl)))}catch(_:Throwable){}};visibility=View.GONE};b.addView(l,LinearLayout.LayoutParams(-1,-2));b.addView(statusTitle,LinearLayout.LayoutParams(-1,-2));b.addView(statusDetail,LinearLayout.LayoutParams(-1,-2));b.addView(progress,LinearLayout.LayoutParams(-2,-2));b.addView(retryButton,LinearLayout.LayoutParams(-1,-2).apply{topMargin=18});b.addView(browserButton,LinearLayout.LayoutParams(-1,-2));return b}
    private fun showLoading(t:String,d:String){fatalShown=false;statusTitle.text=t;statusDetail.text=d;progress.visibility=View.VISIBLE;retryButton.visibility=View.GONE;browserButton.visibility=View.GONE;statusOverlay.visibility=View.VISIBLE;statusOverlay.bringToFront()}
    private fun showError(t:String,d:String){if(isFinishing)return;fatalShown=true;statusTitle.text=t;statusDetail.text=d;progress.visibility=View.GONE;retryButton.visibility=View.VISIBLE;browserButton.visibility=View.VISIBLE;statusOverlay.visibility=View.VISIBLE;statusOverlay.bringToFront()}
    private fun showFatalError(t:String,d:String){fatalShown=true;statusTitle.text=t;statusDetail.text=d;progress.visibility=View.GONE;retryButton.visibility=View.VISIBLE;browserButton.visibility=View.VISIBLE;statusOverlay.visibility=View.VISIBLE;statusOverlay.bringToFront()}
    override fun onBackPressed(){if(::webView.isInitialized&&webView.canGoBack())webView.goBack()else super.onBackPressed()}
    override fun onDestroy(){handler.removeCallbacksAndMessages(null);if(::webView.isInitialized){webView.stopLoading();webView.destroy()};super.onDestroy()}
}
