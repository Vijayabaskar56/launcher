package com.margelo.nitro.widgethost

import android.content.Context
import android.os.Build
import android.util.SizeF
import android.view.View
import android.widget.FrameLayout
import androidx.annotation.Keep
import com.facebook.proguard.annotations.DoNotStrip

/**
 * HybridView that wraps a native Android AppWidgetHostView.
 * Props: appWidgetId, widgetWidth, widgetHeight
 * Methods: onStatusChange(callback)
 */
@Keep
@DoNotStrip
class HybridAppWidgetView(context: Context) : HybridAppWidgetViewSpec() {

    private val container = FrameLayout(context)
    private var currentWidgetId: Int = -1
    private var hostView: TrackedAppWidgetHostView? = null
    private var statusCallback: ((String) -> Unit)? = null

    override val view: View = container

    init {
        container.addOnLayoutChangeListener { _, _, _, _, _, _, _, _, _ ->
            updateWidgetSize()
        }
    }

    // Props — set by React via codegen
    override var appWidgetId: Double = 0.0
    override var widgetWidth: Double = 0.0
    override var widgetHeight: Double = 0.0

    override fun afterUpdate() {
        val newWidgetId = appWidgetId.toInt()
        if (newWidgetId <= 0) {
            hostView?.statusCallback = null
            container.removeAllViews()
            hostView = null
            currentWidgetId = -1
            return
        }

        if (newWidgetId == currentWidgetId) {
            container.post { updateWidgetSize() }
            return
        }

        // Remove old widget view
        hostView?.statusCallback = null
        container.removeAllViews()
        hostView = null

        currentWidgetId = newWidgetId
        statusCallback?.invoke("loading")

        try {
            val manager = AppWidgetHostManager.getInstance(container.context)
            val tracked = manager.createView(container.context, newWidgetId)

            // Subscribe to status
            tracked.statusCallback = { status ->
                statusCallback?.invoke(status)
            }

            // Touch interception — let widget handle its own touches
            tracked.setOnTouchListener { v, _ ->
                v.parent?.requestDisallowInterceptTouchEvent(true)
                false
            }

            container.addView(
                tracked,
                FrameLayout.LayoutParams(
                    FrameLayout.LayoutParams.MATCH_PARENT,
                    FrameLayout.LayoutParams.MATCH_PARENT
                )
            )
            hostView = tracked

            // Update widget size after layout
            container.post { updateWidgetSize() }
        } catch (_: Exception) {
            statusCallback?.invoke("error")
        }
    }

    override fun onStatusChange(callback: (status: String) -> Unit) {
        statusCallback = callback
        // Report current status if widget is already mounted
        if (hostView != null) {
            callback("ready")
        } else if (currentWidgetId > 0) {
            callback("loading")
        }
    }

    override fun onDropView() {
        hostView?.statusCallback = null
        container.removeAllViews()
        hostView = null
        statusCallback = null
        currentWidgetId = -1
    }

    private fun updateWidgetSize() {
        val tracked = hostView ?: return
        val width = if (container.width > 0) container.width else (widgetWidth * container.resources.displayMetrics.density).toInt()
        val height = if (container.height > 0) container.height else (widgetHeight * container.resources.displayMetrics.density).toInt()

        if (width <= 0 || height <= 0) return

        val widthDp = (width / container.resources.displayMetrics.density)
        val heightDp = (height / container.resources.displayMetrics.density)

        if (Build.VERSION.SDK_INT >= 31) {
            tracked.updateAppWidgetSize(
                android.os.Bundle(),
                arrayListOf(SizeF(widthDp, heightDp))
            )
        } else {
            @Suppress("DEPRECATION")
            tracked.updateAppWidgetSize(
                null,
                widthDp.toInt(), heightDp.toInt(),
                widthDp.toInt(), heightDp.toInt()
            )
        }
    }
}
