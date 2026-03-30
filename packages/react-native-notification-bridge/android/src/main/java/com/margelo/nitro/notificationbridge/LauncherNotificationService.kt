package com.margelo.nitro.notificationbridge

import android.media.session.MediaSession
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import androidx.core.app.NotificationCompat

/**
 * NotificationListenerService that provides badge count events and
 * media session token extraction from notifications.
 *
 * Replaces expo-android-notification-listener-service with a single
 * service that handles both badges and media.
 */
class LauncherNotificationService : NotificationListenerService() {

    override fun onListenerConnected() {
        super.onListenerConnected()
        instance = this

        // Process all active notifications on connect
        val active = activeNotifications ?: return
        for (sbn in active) {
            notificationPostedCallback?.invoke(sbn.packageName, sbn.key)
            checkMediaSession(sbn)
        }
    }

    override fun onNotificationPosted(sbn: StatusBarNotification?) {
        sbn ?: return
        notificationPostedCallback?.invoke(sbn.packageName, sbn.key)
        checkMediaSession(sbn)
    }

    override fun onNotificationRemoved(sbn: StatusBarNotification?) {
        sbn ?: return
        notificationRemovedCallback?.invoke(sbn.key)
        mediaNotifications.remove(sbn.key)

        if (sbn.key == activeMediaNotificationKey) {
            activeMediaNotificationKey = null
            findBestMediaSession()
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        if (instance == this) {
            instance = null
            mediaNotifications.clear()
            activeMediaNotificationKey = null
        }
    }

    /**
     * Check if a notification contains a media session token.
     * If it does, track it and potentially update the active media session.
     */
    private fun checkMediaSession(sbn: StatusBarNotification) {
        val extras = sbn.notification.extras ?: return
        @Suppress("DEPRECATION")
        val token = extras.getParcelable<MediaSession.Token>(
            NotificationCompat.EXTRA_MEDIA_SESSION
        ) ?: return

        // Track this notification as having a media session
        mediaNotifications[sbn.key] = MediaNotificationInfo(
            key = sbn.key,
            packageName = sbn.packageName,
            postTime = sbn.postTime,
            token = token
        )

        // If this is more recent than current, switch to it
        val currentKey = activeMediaNotificationKey
        if (currentKey == null) {
            activateMediaSession(sbn.key, token)
        } else {
            val currentInfo = mediaNotifications[currentKey]
            if (currentInfo == null || sbn.postTime >= currentInfo.postTime) {
                activateMediaSession(sbn.key, token)
            }
        }
    }

    /**
     * Find the best (most recent) media session from tracked notifications.
     */
    private fun findBestMediaSession() {
        val best = mediaNotifications.values.maxByOrNull { it.postTime }
        if (best != null) {
            activateMediaSession(best.key, best.token)
        } else {
            mediaSessionHandler?.setMediaSessionToken(null)
        }
    }

    private fun activateMediaSession(key: String, token: MediaSession.Token) {
        activeMediaNotificationKey = key
        mediaSessionHandler?.setMediaSessionToken(token)
    }

    private data class MediaNotificationInfo(
        val key: String,
        val packageName: String,
        val postTime: Long,
        val token: MediaSession.Token,
    )

    companion object {
        @Volatile
        var instance: LauncherNotificationService? = null
            private set

        // Badge callbacks (last-writer-wins)
        var notificationPostedCallback: ((packageName: String, key: String) -> Unit)? = null
        var notificationRemovedCallback: ((key: String) -> Unit)? = null

        // Media session handler reference
        var mediaSessionHandler: MediaSessionHandler? = null

        // Track notifications with media sessions
        private val mediaNotifications = mutableMapOf<String, MediaNotificationInfo>()
        private var activeMediaNotificationKey: String? = null
    }
}
