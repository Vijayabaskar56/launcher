package com.margelo.nitro.notificationbridge

import android.content.Context
import android.graphics.Bitmap
import android.media.MediaMetadata as AndroidMediaMetadata
import android.media.session.MediaController
import android.media.session.MediaSession
import android.media.session.PlaybackState as AndroidPlaybackState
import android.net.Uri
import android.os.Handler
import android.os.Looper
import java.io.File
import java.io.FileOutputStream
import java.net.URL
import java.util.concurrent.Executors

/**
 * Manages the active MediaController and pushes metadata/playback state
 * changes to JS via callbacks.
 *
 * Follows the Kvaesitso MusicService.kt pattern:
 * - Extract metadata from MediaController.Callback
 * - Save album art to cache dir as file path
 * - Map PlaybackState to our enum
 */
class MediaSessionHandler(private val context: Context) {

    private var controller: MediaController? = null
    private var registeredCallback: MediaController.Callback? = null
    private val mainHandler = Handler(Looper.getMainLooper())
    private val ioExecutor = Executors.newSingleThreadExecutor()

    // JS callbacks (last-writer-wins)
    var onMetadataChanged: ((MediaMetadata?) -> Unit)? = null
    var onPlaybackStateChanged: ((PlaybackState) -> Unit)? = null

    /**
     * Set or clear the active media session token.
     * Registers a callback on the new controller and immediately
     * pushes current state to JS.
     */
    fun setMediaSessionToken(token: MediaSession.Token?) {
        // Unregister previous callback
        val prevCallback = registeredCallback
        if (prevCallback != null) {
            controller?.unregisterCallback(prevCallback)
            registeredCallback = null
        }

        if (token == null) {
            controller = null
            onMetadataChanged?.invoke(null)
            onPlaybackStateChanged?.invoke(PlaybackState.NONE)
            return
        }

        val newController = MediaController(context, token)
        controller = newController

        // Create and register callback
        val callback = object : MediaController.Callback() {
            override fun onMetadataChanged(metadata: AndroidMediaMetadata?) {
                handleMetadataChanged(metadata, newController.packageName)
            }

            override fun onPlaybackStateChanged(state: AndroidPlaybackState?) {
                handlePlaybackStateChanged(state)
            }

            override fun onSessionDestroyed() {
                onMetadataChanged?.invoke(null)
                onPlaybackStateChanged?.invoke(PlaybackState.NONE)
            }
        }

        registeredCallback = callback
        newController.registerCallback(callback, mainHandler)

        // Push current state immediately
        handleMetadataChanged(newController.metadata, newController.packageName)
        handlePlaybackStateChanged(newController.playbackState)
    }

    // Transport controls
    fun play() {
        controller?.transportControls?.play()
    }

    fun pause() {
        controller?.transportControls?.pause()
    }

    fun skipToNext() {
        controller?.transportControls?.skipToNext()
    }

    fun skipToPrevious() {
        controller?.transportControls?.skipToPrevious()
    }

    private fun handleMetadataChanged(metadata: AndroidMediaMetadata?, packageName: String) {
        if (metadata == null) {
            onMetadataChanged?.invoke(null)
            return
        }

        val title = metadata.getString(AndroidMediaMetadata.METADATA_KEY_TITLE)
            ?: metadata.getString(AndroidMediaMetadata.METADATA_KEY_DISPLAY_TITLE)

        val artist = metadata.getString(AndroidMediaMetadata.METADATA_KEY_ARTIST)
            ?: metadata.getString(AndroidMediaMetadata.METADATA_KEY_DISPLAY_SUBTITLE)

        val album = metadata.getString(AndroidMediaMetadata.METADATA_KEY_ALBUM)

        val duration = metadata.getLong(AndroidMediaMetadata.METADATA_KEY_DURATION)
            .let { if (it <= 0) -1.0 else it.toDouble() }

        // Inline bitmaps can be extracted on the main thread (fast)
        val inlineBitmap = metadata.getBitmap(AndroidMediaMetadata.METADATA_KEY_ALBUM_ART)
            ?: metadata.getBitmap(AndroidMediaMetadata.METADATA_KEY_ART)

        if (inlineBitmap != null) {
            val albumArtPath = saveBitmapToCache(inlineBitmap)
            emitMetadata(title, artist, album, albumArtPath, duration, packageName)
            return
        }

        // URI-based art may require network — load off main thread
        val uriString = metadata.getString(AndroidMediaMetadata.METADATA_KEY_ALBUM_ART_URI)
            ?: metadata.getString(AndroidMediaMetadata.METADATA_KEY_ART_URI)

        if (uriString != null) {
            // Emit immediately without art, then update when art is ready
            emitMetadata(title, artist, album, null, duration, packageName)
            ioExecutor.execute {
                val albumArtPath = loadAndCacheFromUri(uriString)
                if (albumArtPath != null) {
                    mainHandler.post {
                        emitMetadata(title, artist, album, albumArtPath, duration, packageName)
                    }
                }
            }
            return
        }

        emitMetadata(title, artist, album, null, duration, packageName)
    }

    private fun emitMetadata(
        title: String?, artist: String?, album: String?,
        albumArtPath: String?, duration: Double, packageName: String,
    ) {
        onMetadataChanged?.invoke(
            MediaMetadata(
                title = title, artist = artist, album = album,
                albumArtPath = albumArtPath, duration = duration,
                packageName = packageName,
            )
        )
    }

    private fun handlePlaybackStateChanged(state: AndroidPlaybackState?) {
        val mapped = when (state?.state) {
            AndroidPlaybackState.STATE_PLAYING,
            AndroidPlaybackState.STATE_BUFFERING,
            AndroidPlaybackState.STATE_FAST_FORWARDING,
            AndroidPlaybackState.STATE_REWINDING -> PlaybackState.PLAYING

            AndroidPlaybackState.STATE_PAUSED -> PlaybackState.PAUSED

            AndroidPlaybackState.STATE_STOPPED,
            AndroidPlaybackState.STATE_ERROR -> PlaybackState.STOPPED

            else -> PlaybackState.NONE
        }
        onPlaybackStateChanged?.invoke(mapped)
    }

    private val artDir: File by lazy {
        File(context.cacheDir, "album-art").also { if (!it.exists()) it.mkdirs() }
    }

    /** Write to a temp file then atomically rename to avoid half-read races */
    private fun writeToCache(writer: (FileOutputStream) -> Unit): String? {
        return try {
            val tmp = File(artDir, "current.tmp")
            val target = File(artDir, "current.png")
            FileOutputStream(tmp).use { writer(it) }
            tmp.renameTo(target)
            target.absolutePath
        } catch (_: Exception) {
            null
        }
    }

    private fun saveBitmapToCache(bitmap: Bitmap): String? {
        return writeToCache { out -> bitmap.compress(Bitmap.CompressFormat.PNG, 90, out) }
    }

    private fun loadAndCacheFromUri(uriString: String): String? {
        return try {
            val uri = Uri.parse(uriString)
            val input = when (uri.scheme) {
                "content" -> context.contentResolver.openInputStream(uri)
                "http", "https" -> URL(uriString).openStream()
                else -> null
            } ?: return null

            writeToCache { out -> input.use { it.copyTo(out) } }
        } catch (_: Exception) {
            null
        }
    }
}
