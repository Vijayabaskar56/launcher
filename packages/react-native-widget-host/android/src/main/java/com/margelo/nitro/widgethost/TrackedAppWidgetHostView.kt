package com.margelo.nitro.widgethost

import android.appwidget.AppWidgetHostView
import android.content.Context
import android.view.View
import android.widget.RemoteViews

/**
 * AppWidgetHostView that tracks rendering state and reports
 * ready/error status via a callback.
 */
class TrackedAppWidgetHostView(context: Context) : AppWidgetHostView(context) {

    var statusCallback: ((String) -> Unit)? = null

    override fun updateAppWidget(remoteViews: RemoteViews?) {
        try {
            super.updateAppWidget(remoteViews)
            if (remoteViews != null) {
                statusCallback?.invoke("ready")
            }
        } catch (e: Exception) {
            statusCallback?.invoke("error")
        }
    }

    override fun getErrorView(): View {
        statusCallback?.invoke("error")
        return super.getErrorView()
    }

    override fun onViewAdded(child: android.view.View?) {
        super.onViewAdded(child)
        // Enable nested scrolling for scrollable widget content
        enableNestedScroll(child)
    }

    private fun enableNestedScroll(view: android.view.View?) {
        if (view == null) return
        if (view is android.view.ViewGroup) {
            for (i in 0 until view.childCount) {
                enableNestedScroll(view.getChildAt(i))
            }
        }
        if (view is android.widget.ListView || view is android.widget.ScrollView) {
            view.isNestedScrollingEnabled = true
        }
    }
}
