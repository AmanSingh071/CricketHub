package io.github.ddagunts.screencast

import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.graphics.Color
import android.view.Gravity
import android.view.ViewGroup
import android.widget.Button
import android.widget.LinearLayout
import android.widget.ProgressBar
import android.widget.TextView
import androidx.activity.ComponentActivity
import androidx.lifecycle.lifecycleScope
import io.github.ddagunts.screencast.cast.CastDevice
import io.github.ddagunts.screencast.cast.CastDiscovery
import io.github.ddagunts.screencast.cast.CHROMECAST_DEFAULT_PORT
import io.github.ddagunts.screencast.webrtc.DEFAULT_WEBRTC_APP_ID
import kotlinx.coroutines.launch

/**
 * CricketHub entry point launched by crickethub://cast?url=...
 *
 * This is intentionally a very small native bridge. The actual capture/Cast
 * protocol is provided by the open-source ScreenCast WebRTC implementation.
 * The TV needs no CricketHub software: the phone screen is captured and sent
 * to the project's already-hosted receiver.
 */
class CricketHubCastActivity : ComponentActivity() {
    private lateinit var discovery: CastDiscovery
    private lateinit var list: LinearLayout
    private lateinit var status: TextView
    private var channelUrl: String = ""
    private var channelName: String = "CricketHub"

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        channelUrl = intent.data?.getQueryParameter("url").orEmpty()
        channelName = intent.data?.getQueryParameter("name") ?: "CricketHub"
        if (channelUrl.isBlank()) {
            finish()
            return
        }

        val root = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(36, 40, 36, 32)
            setBackgroundColor(Color.rgb(7, 15, 24))
        }
        val title = TextView(this).apply {
            text = "Cast $channelName"
            textSize = 24f
            setTextColor(Color.WHITE)
            gravity = Gravity.CENTER
        }
        status = TextView(this).apply {
            text = "Looking for TVs on this Wi-Fi…"
            textSize = 15f
            setTextColor(Color.LTGRAY)
            gravity = Gravity.CENTER
            setPadding(0, 18, 0, 18)
        }
        list = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL }
        val spinner = ProgressBar(this).apply { isIndeterminate = true }
        root.addView(title, LinearLayout.LayoutParams(-1, -2))
        root.addView(status, LinearLayout.LayoutParams(-1, -2))
        root.addView(spinner, LinearLayout.LayoutParams(-1, 56))
        root.addView(list, LinearLayout.LayoutParams(-1, 0, 1f))
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
            status.text = "No Cast TV found yet. Make sure the phone and TV are on the same Wi-Fi."
            return
        }
        status.text = "Choose a TV"
        devices.forEach { device ->
            val button = Button(this).apply {
                text = "📺  ${device.name}"
                textSize = 17f
                isAllCaps = false
                setOnClickListener { castTo(device) }
            }
            list.addView(button, LinearLayout.LayoutParams(-1, ViewGroup.LayoutParams.WRAP_CONTENT).apply {
                bottomMargin = 14
            })
        }
    }

    private fun castTo(device: CastDevice) {
        // Put the actual player in the foreground before requesting capture.
        // After the Android consent dialog returns, the trampoline launches the
        // same URL again so the captured surface is the player, not this picker.
        runCatching {
            startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(channelUrl)))
        }
        Handler(Looper.getMainLooper()).postDelayed({
            startActivity(Intent(this, WebRtcProjectionRequestActivity::class.java).apply {
                putExtra(WebRtcForegroundService.EXTRA_DEVICE_NAME, device.name)
                putExtra(WebRtcForegroundService.EXTRA_DEVICE_HOST, device.host)
                putExtra(WebRtcForegroundService.EXTRA_DEVICE_PORT, if (device.port > 0) device.port else CHROMECAST_DEFAULT_PORT)
                putExtra(WebRtcForegroundService.EXTRA_APP_ID, DEFAULT_WEBRTC_APP_ID)
                putExtra(WebRtcForegroundService.EXTRA_PLAYER_URL, channelUrl)
            })
            finish()
        }, 450)
    }

    override fun onDestroy() {
        if (::discovery.isInitialized) discovery.stop()
        super.onDestroy()
    }
}
