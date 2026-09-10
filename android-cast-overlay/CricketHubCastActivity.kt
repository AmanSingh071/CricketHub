package io.github.ddagunts.screencast

import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.graphics.Color
import android.graphics.Typeface
import android.view.View
import android.view.ViewGroup
import android.widget.Button
import android.widget.LinearLayout
import android.widget.ProgressBar
import android.widget.ScrollView
import android.widget.TextView
import androidx.activity.ComponentActivity
import androidx.core.view.WindowCompat
import androidx.lifecycle.lifecycleScope
import io.github.ddagunts.screencast.cast.CastDevice
import io.github.ddagunts.screencast.cast.CastDiscovery
import io.github.ddagunts.screencast.cast.CHROMECAST_DEFAULT_PORT
import io.github.ddagunts.screencast.webrtc.DEFAULT_WEBRTC_APP_ID
import kotlinx.coroutines.launch

/** Phone-only CricketHub casting screen. TV requires no CricketHub software. */
class CricketHubCastActivity : ComponentActivity() {
    private lateinit var discovery: CastDiscovery
    private lateinit var list: LinearLayout
    private lateinit var status: TextView
    private lateinit var spinner: ProgressBar
    private var channelUrl = ""
    private var channelName = "CricketHub"

    private val green = Color.rgb(34, 197, 94)
    private val bg = Color.rgb(7, 17, 31)
    private val card = Color.rgb(12, 29, 47)
    private val white = Color.WHITE
    private val muted = Color.rgb(148, 163, 184)

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        WindowCompat.enableEdgeToEdge(window)

        channelUrl = intent.data?.getQueryParameter("url").orEmpty()
        channelName = intent.data?.getQueryParameter("name") ?: "CricketHub"
        if (channelUrl.isBlank()) { finish(); return }

        val root = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setBackgroundColor(bg)
            setPadding(dp(18), dp(18), dp(18), dp(20))
        }
        val scroll = ScrollView(this).apply { setBackgroundColor(bg) }
        val content = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(dp(2), dp(38), dp(2), dp(20))
        }

        val brand = TextView(this).apply {
            text = "🏏 CricketHub"
            textSize = 18f
            typeface = Typeface.DEFAULT_BOLD
            setTextColor(green)
        }
        val title = TextView(this).apply {
            text = "Cast to your TV"
            textSize = 30f
            typeface = Typeface.DEFAULT_BOLD
            setTextColor(white)
            setPadding(0, dp(10), 0, 0)
        }
        val channel = TextView(this).apply {
            text = channelName
            textSize = 15f
            setTextColor(muted)
            setPadding(0, dp(4), 0, dp(18))
        }

        val info = TextView(this).apply {
            text = "📱  Phone → 📺 TV\n\nYour phone will show the player first. Then Android will ask for screen-capture permission.\n\nKeep both devices on the same Wi-Fi."
            textSize = 14f
            setTextColor(Color.rgb(226,232,240))
            setPadding(dp(16), dp(16), dp(16), dp(16))
            setBackgroundColor(card)
        }

        status = TextView(this).apply {
            text = "Finding TVs on your Wi-Fi…"
            textSize = 14f
            typeface = Typeface.DEFAULT_BOLD
            setTextColor(white)
            setPadding(0, dp(24), 0, dp(8))
        }
        spinner = ProgressBar(this).apply { isIndeterminate = true }
        list = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL }

        content.addView(brand, lp())
        content.addView(title, lp())
        content.addView(channel, lp())
        content.addView(info, lp(bottom = 6))
        content.addView(status, lp())
        content.addView(spinner, lp(height = dp(34)))
        content.addView(list, lp())
        scroll.addView(content)
        root.addView(scroll, LinearLayout.LayoutParams(-1, 0, 1f))
        setContentView(root)

        discovery = CastDiscovery(this)
        lifecycleScope.launch {
            discovery.flow.collect { devices -> renderDevices(devices) }
        }
        discovery.start()
    }

    private fun renderDevices(devices: List<CastDevice>) {
        list.removeAllViews()
        if (devices.isEmpty()) {
            spinner.visibility = View.VISIBLE
            status.text = "Finding TVs on your Wi-Fi…"
            return
        }
        spinner.visibility = View.GONE
        status.text = "Select your TV"
        devices.forEach { device ->
            val button = Button(this).apply {
                text = "📺  ${device.name}"
                textSize = 16f
                isAllCaps = false
                setTextColor(Color.WHITE)
                setPadding(dp(12), dp(5), dp(12), dp(5))
                setOnClickListener { castTo(device) }
            }
            list.addView(button, LinearLayout.LayoutParams(-1, dp(54)).apply {
                bottomMargin = dp(10)
            })
        }
    }

    private fun castTo(device: CastDevice) {
        status.text = "Opening ${device.name}…"
        list.isEnabled = false
        runCatching { startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(channelUrl))) }
        android.os.Handler(mainLooper).postDelayed({
            startActivity(Intent(this, WebRtcProjectionRequestActivity::class.java).apply {
                putExtra(WebRtcForegroundService.EXTRA_DEVICE_NAME, device.name)
                putExtra(WebRtcForegroundService.EXTRA_DEVICE_HOST, device.host)
                putExtra(WebRtcForegroundService.EXTRA_DEVICE_PORT, if (device.port > 0) device.port else CHROMECAST_DEFAULT_PORT)
                putExtra(WebRtcForegroundService.EXTRA_APP_ID, DEFAULT_WEBRTC_APP_ID)
                putExtra("crickethub_player_url", channelUrl)
            })
            finish()
        }, 650)
    }

    private fun dp(value: Int) = (value * resources.displayMetrics.density).toInt()
    private fun lp(height: Int = ViewGroup.LayoutParams.WRAP_CONTENT, bottom: Int = 0) =
        LinearLayout.LayoutParams(-1, height).apply { bottomMargin = dp(bottom) }

    override fun onDestroy() {
        if (::discovery.isInitialized) discovery.stop()
        super.onDestroy()
    }
}
