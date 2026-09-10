package com.crickethub.cast

import android.app.Activity
import android.app.UiModeManager
import android.content.Context
import android.content.Intent
import android.content.res.Configuration
import android.graphics.Color
import android.net.nsd.NsdManager
import android.net.nsd.NsdServiceInfo
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.util.Base64
import android.view.Gravity
import android.view.View
import android.webkit.WebResourceRequest
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.ArrayAdapter
import android.widget.Button
import android.widget.LinearLayout
import android.widget.TextView
import android.widget.Toast
import org.json.JSONObject
import java.io.BufferedReader
import java.io.InputStreamReader
import java.io.OutputStreamWriter
import java.net.ServerSocket
import java.net.Socket
import java.net.URLDecoder
import java.util.UUID
import java.util.concurrent.Executors

class MainActivity : Activity() {
    private val siteUrl = "https://crickethub-idnefycqb-vibe-coder22.vercel.app"
    private val serviceType = "_crickethub._tcp."
    private val executor = Executors.newCachedThreadPool()
    private val main = Handler(Looper.getMainLooper())
    private var webView: WebView? = null
    private var nsd: NsdManager? = null
    private var discovery: NsdManager.DiscoveryListener? = null
    private var server: ServerSocket? = null
    private var registration: NsdManager.RegistrationListener? = null
    private val receivers = linkedMapOf<String, NsdServiceInfo>()
    private var pendingUrl: String? = null
    private var pendingName: String? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        if (isTv()) startReceiver() else startPhone()
        handleIntent(intent)
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        handleIntent(intent)
    }

    private fun isTv(): Boolean {
        val mode = getSystemService(Context.UI_MODE_SERVICE) as UiModeManager
        return mode.currentModeType == Configuration.UI_MODE_TYPE_TELEVISION
    }

    private fun startPhone() {
        val root = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL }
        webView = WebView(this).apply {
            settings.javaScriptEnabled = true
            settings.domStorageEnabled = true
            settings.mediaPlaybackRequiresUserGesture = false
            settings.allowContentAccess = true
            settings.allowFileAccess = false
            webViewClient = object : WebViewClient() {
                override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean {
                    val uri = request.url
                    if (uri.scheme == "crickethub" && uri.host == "cast") {
                        handleCastUri(uri.toString())
                        return true
                    }
                    return false
                }
                override fun shouldOverrideUrlLoading(view: WebView, url: String): Boolean {
                    if (url.startsWith("crickethub://cast")) { handleCastUri(url); return true }
                    return false
                }
            }
            loadUrl(siteUrl)
        }
        root.addView(webView, LinearLayout.LayoutParams(-1, -1))
        setContentView(root)
    }

    private fun startReceiver() {
        window.decorView.systemUiVisibility = View.SYSTEM_UI_FLAG_FULLSCREEN or View.SYSTEM_UI_FLAG_HIDE_NAVIGATION or View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
        val root = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER
            setBackgroundColor(Color.rgb(5, 11, 18))
            setPadding(48, 32, 48, 32)
        }
        val title = TextView(this).apply {
            text = "📺  CricketHub TV"
            textSize = 30f
            setTextColor(Color.WHITE)
            gravity = Gravity.CENTER
        }
        val status = TextView(this).apply {
            text = "Ready — open CricketHub on your Android phone and tap Cast."
            textSize = 18f
            setTextColor(Color.LTGRAY)
            gravity = Gravity.CENTER
            setPadding(0, 24, 0, 0)
        }
        root.addView(title, LinearLayout.LayoutParams(-1, -2))
        root.addView(status, LinearLayout.LayoutParams(-1, -2))
        setContentView(root)
        startLocalReceiverServer(status)
    }

    private fun startLocalReceiverServer(status: TextView) {
        executor.execute {
            try {
                val s = ServerSocket(0)
                server = s
                val token = UUID.randomUUID().toString().replace("-", "").take(12)
                advertise(s.localPort, token)
                main.post { status.text = "Ready — this TV is visible to CricketHub on the same Wi‑Fi." }
                while (!s.isClosed) {
                    val client = s.accept()
                    executor.execute { handleClient(client, token) }
                }
            } catch (_: Exception) { }
        }
    }

    private fun advertise(port: Int, token: String) {
        nsd = getSystemService(Context.NSD_SERVICE) as NsdManager
        val info = NsdServiceInfo().apply {
            serviceName = "CricketHub TV"
            serviceType = serviceType
            this.port = port
            setAttribute("v", "1")
            setAttribute("token", token)
        }
        registration = object : NsdManager.RegistrationListener {
            override fun onServiceRegistered(serviceInfo: NsdServiceInfo) { }
            override fun onRegistrationFailed(serviceInfo: NsdServiceInfo, errorCode: Int) { }
            override fun onServiceUnregistered(serviceInfo: NsdServiceInfo) { }
            override fun onUnregistrationFailed(serviceInfo: NsdServiceInfo, errorCode: Int) { }
        }
        nsd?.registerService(info, NsdManager.PROTOCOL_DNS_SD, registration)
    }

    private fun handleClient(socket: Socket, token: String) {
        socket.use {
            val reader = BufferedReader(InputStreamReader(it.getInputStream()))
            val line = reader.readLine() ?: return
            val parts = line.split("|", limit = 4)
            if (parts.size != 4 || parts[0] != "CH1" || parts[1] != token) return
            val name = String(Base64.decode(parts[2], Base64.DEFAULT), Charsets.UTF_8)
            val url = String(Base64.decode(parts[3], Base64.DEFAULT), Charsets.UTF_8)
            main.post { showOnTv(name, url) }
            OutputStreamWriter(it.getOutputStream()).use { out -> out.write("OK\n"); out.flush() }
        }
    }

    private fun showOnTv(name: String, url: String) {
        val root = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER
            setBackgroundColor(Color.BLACK)
        }
        val player = WebView(this).apply {
            settings.javaScriptEnabled = true
            settings.domStorageEnabled = true
            settings.mediaPlaybackRequiresUserGesture = false
            settings.allowContentAccess = true
            settings.allowFileAccess = false
            webViewClient = WebViewClient()
            loadUrl(url)
        }
        root.addView(player, LinearLayout.LayoutParams(-1, -1))
        setContentView(root)
        title = "CricketHub TV — $name"
    }

    private fun handleIntent(intent: Intent?) {
        val data = intent?.data ?: return
        if (data.scheme == "crickethub" && data.host == "cast") handleCastUri(data.toString())
    }

    private fun handleCastUri(raw: String) {
        try {
            val uri = android.net.Uri.parse(raw)
            val url = uri.getQueryParameter("url") ?: return
            val name = uri.getQueryParameter("name") ?: "Channel"
            pendingUrl = url
            pendingName = name
            discoverAndChooseTv()
        } catch (_: Exception) { toast("Could not start TV casting") }
    }

    private fun discoverAndChooseTv() {
        receivers.clear()
        discovery?.let { try { nsd?.stopServiceDiscovery(it) } catch (_: Exception) {} }
        nsd = getSystemService(Context.NSD_SERVICE) as NsdManager
        val listener = object : NsdManager.DiscoveryListener {
            override fun onDiscoveryStarted(regType: String) { }
            override fun onServiceFound(info: NsdServiceInfo) {
                if (info.serviceType != serviceType) return
                nsd?.resolveService(info, object : NsdManager.ResolveListener {
                    override fun onResolveFailed(serviceInfo: NsdServiceInfo, errorCode: Int) { }
                    override fun onServiceResolved(resolved: NsdServiceInfo) {
                        val token = resolved.attributes["token"]?.toString(Charsets.UTF_8) ?: return
                        synchronized(receivers) { receivers[resolved.serviceName] = resolved }
                        if (receivers.size == 1) main.postDelayed({ showTvChooser(token) }, 350)
                    }
                })
            }
            override fun onServiceLost(info: NsdServiceInfo) { receivers.remove(info.serviceName) }
            override fun onDiscoveryStopped(regType: String) { }
            override fun onStartDiscoveryFailed(regType: String, errorCode: Int) { main.post { toast("TV discovery failed") } }
            override fun onStopDiscoveryFailed(regType: String, errorCode: Int) { }
        }
        discovery = listener
        nsd?.discoverServices(serviceType, NsdManager.PROTOCOL_DNS_SD, listener)
        main.postDelayed({
            if (receivers.isEmpty()) toast("No CricketHub TV found. Install CricketHub TV on the TV and keep both on the same Wi‑Fi.")
            else if (receivers.size > 1) showTvChooser(null)
        }, 1800)
    }

    private var chooserShown = false
    private fun showTvChooser(autoToken: String?) {
        if (chooserShown) return
        chooserShown = true
        val list = synchronized(receivers) { receivers.values.toList() }
        if (list.isEmpty()) { chooserShown = false; return }
        if (list.size == 1) {
            val info = list[0]
            val token = info.attributes["token"]?.toString(Charsets.UTF_8) ?: autoToken
            if (token != null) sendToTv(info, token)
            return
        }
        val names = list.map { it.serviceName }.toTypedArray()
        android.app.AlertDialog.Builder(this)
            .setTitle("Choose a TV")
            .setItems(names) { _, which ->
                val info = list[which]
                val token = info.attributes["token"]?.toString(Charsets.UTF_8)
                if (token != null) sendToTv(info, token)
            }
            .setOnDismissListener { chooserShown = false }
            .show()
    }

    private fun sendToTv(info: NsdServiceInfo, token: String) {
        val url = pendingUrl ?: return
        val name = pendingName ?: "Channel"
        executor.execute {
            try {
                Socket(info.host, info.port).use { socket ->
                    val n = Base64.encodeToString(name.toByteArray(), Base64.NO_WRAP)
                    val u = Base64.encodeToString(url.toByteArray(), Base64.NO_WRAP)
                    val out = OutputStreamWriter(socket.getOutputStream())
                    out.write("CH1|$token|$n|$u\n")
                    out.flush()
                    val reply = BufferedReader(InputStreamReader(socket.getInputStream())).readLine()
                    main.post { toast(if (reply == "OK") "Playing on ${info.serviceName}" else "TV rejected the connection") }
                }
            } catch (_: Exception) { main.post { toast("Could not connect to ${info.serviceName}") } }
        }
    }

    private fun toast(text: String) = main.post { Toast.makeText(this, text, Toast.LENGTH_LONG).show() }

    override fun onDestroy() {
        super.onDestroy()
        try { discovery?.let { nsd?.stopServiceDiscovery(it) } } catch (_: Exception) {}
        try { registration?.let { nsd?.unregisterService(it) } } catch (_: Exception) {}
        try { server?.close() } catch (_: Exception) {}
        executor.shutdownNow()
        webView?.destroy()
    }
}
