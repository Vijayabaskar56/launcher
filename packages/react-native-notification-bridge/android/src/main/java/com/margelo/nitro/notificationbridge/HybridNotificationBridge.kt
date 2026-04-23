package com.margelo.nitro.notificationbridge

import android.content.Context
import android.content.Intent
import android.provider.Settings
import android.text.TextUtils
import androidx.annotation.Keep
import com.facebook.proguard.annotations.DoNotStrip
import com.margelo.nitro.NitroModules

@Keep
@DoNotStrip
class HybridNotificationBridge : HybridNotificationBridgeSpec() {

    private val context: Context
        get() = NitroModules.applicationContext
            ?: throw Error("No ApplicationContext set!")

    private val mediaHandler: MediaSessionHandler by lazy {
        MediaSessionHandler(context).also {
            LauncherNotificationService.mediaSessionHandler = it
            LauncherNotificationService.refreshActiveMediaSession()
        }
    }

    // --- Permission ---

    override val isNotificationListenerEnabled: Boolean
        get() {
            val enabledListeners = Settings.Secure.getString(
                context.contentResolver,
                "enabled_notification_listeners"
            ) ?: return false
            val colonSplitter = TextUtils.SimpleStringSplitter(':')
            colonSplitter.setString(enabledListeners)
            val serviceName = "${context.packageName}/${LauncherNotificationService::class.java.canonicalName}"
            while (colonSplitter.hasNext()) {
                if (colonSplitter.next().equals(serviceName, ignoreCase = true)) {
                    return true
                }
            }
            return false
        }

    override fun openNotificationListenerSettings() {
        val intent = Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS)
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        context.startActivity(intent)
    }

    // --- Badge count callbacks ---

    override fun onNotificationPosted(callback: (packageName: String, key: String) -> Unit) {
        LauncherNotificationService.notificationPostedCallback = callback

        // If service is already connected, push current notifications
        val service = LauncherNotificationService.instance
        if (service != null) {
            val active = service.activeNotifications
            if (active != null) {
                for (sbn in active) {
                    callback(sbn.packageName, sbn.key)
                }
            }
        }
    }

    override fun onNotificationRemoved(callback: (key: String) -> Unit) {
        LauncherNotificationService.notificationRemovedCallback = callback
    }

    // --- Media session callbacks ---

    override fun onMediaMetadataChanged(callback: (metadata: MediaMetadata?) -> Unit) {
        mediaHandler.onMetadataChanged = callback
        LauncherNotificationService.refreshActiveMediaSession()
        mediaHandler.pushCurrentState()
    }

    override fun onPlaybackStateChanged(callback: (state: PlaybackState) -> Unit) {
        mediaHandler.onPlaybackStateChanged = callback
        LauncherNotificationService.refreshActiveMediaSession()
        mediaHandler.pushCurrentPlaybackState()
    }

    override val canSeek: Boolean
        get() = mediaHandler.canSeek()

    override fun getPlaybackPosition(): Double {
        return mediaHandler.getPlaybackPosition()
    }

    // --- Transport controls ---

    override fun play() {
        mediaHandler.play()
    }

    override fun pause() {
        mediaHandler.pause()
    }

    override fun seekTo(positionMs: Double) {
        mediaHandler.seekTo(positionMs.toLong())
    }

    override fun skipToNext() {
        mediaHandler.skipToNext()
    }

    override fun skipToPrevious() {
        mediaHandler.skipToPrevious()
    }
}
