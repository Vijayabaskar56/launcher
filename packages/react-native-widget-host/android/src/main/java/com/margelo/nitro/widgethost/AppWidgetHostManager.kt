package com.margelo.nitro.widgethost

import android.app.Activity
import android.app.Application
import android.appwidget.AppWidgetHost
import android.appwidget.AppWidgetHostView
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProviderInfo
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.Bundle
import com.facebook.react.bridge.ActivityEventListener
import com.facebook.react.bridge.ReactApplicationContext
import com.margelo.nitro.core.Promise

/**
 * Singleton manager for AppWidgetHost lifecycle, widget allocation,
 * binding, and configuration.
 *
 * Auto-manages startListening/stopListening via ActivityLifecycleCallbacks.
 * Handles the async bind flow (allocate → bind permission → configure → return ID).
 */
class AppWidgetHostManager private constructor(context: Context) {

    private val appContext = context.applicationContext
    private val widgetHost = LauncherAppWidgetHost(appContext, HOST_ID)
    private val widgetManager = AppWidgetManager.getInstance(appContext)
    private var isListening = false

    // Pending bind state
    private var pendingBindPromise: Promise<Double>? = null
    private var pendingBindWidgetId: Int = -1
    private var pendingConfigurePromise: Promise<Double>? = null
    private var pendingConfigureWidgetId: Int = -1

    init {
        // Auto-manage lifecycle
        (appContext as? Application)?.registerActivityLifecycleCallbacks(
            object : Application.ActivityLifecycleCallbacks {
                override fun onActivityResumed(activity: Activity) {
                    startListeningSafely()
                }
                override fun onActivityPaused(activity: Activity) {
                    stopListeningSafely()
                }
                override fun onActivityCreated(a: Activity, b: Bundle?) {}
                override fun onActivityStarted(a: Activity) {}
                override fun onActivityStopped(a: Activity) {}
                override fun onActivitySaveInstanceState(a: Activity, b: Bundle) {}
                override fun onActivityDestroyed(a: Activity) {}
            }
        )
    }

    fun getInstalledWidgetProviders(): Array<WidgetProviderInfo> {
        val providers = widgetManager.installedProviders
        return providers.mapNotNull { info ->
            // Filter hidden widgets on API 28+
            if (Build.VERSION.SDK_INT >= 28) {
                val features = info.widgetFeatures
                if (features and AppWidgetProviderInfo.WIDGET_FEATURE_HIDE_FROM_PICKER != 0) {
                    return@mapNotNull null
                }
            }

            val label = info.loadLabel(appContext.packageManager) ?: return@mapNotNull null

            WidgetProviderInfo(
                provider = info.provider.flattenToString(),
                packageName = info.provider.packageName,
                label = label,
                minWidth = info.minWidth.toDouble(),
                minHeight = info.minHeight.toDouble(),
            )
        }
        .sortedBy { it.label.lowercase() }
        .toTypedArray()
    }

    fun allocateAndBindWidget(
        provider: String,
        reactContext: ReactApplicationContext
    ): Promise<Double> {
        if (pendingBindPromise != null || pendingConfigurePromise != null) {
            val promise = Promise<Double>()
            promise.reject(Error("Another widget bind or configure request is already in progress"))
            return promise
        }

        startListeningSafely()

        val widgetId = widgetHost.allocateAppWidgetId()
        val componentName = ComponentName.unflattenFromString(provider)
            ?: run {
                widgetHost.deleteAppWidgetId(widgetId)
                return Promise.resolved((-1).toDouble())
            }

        val canBind = widgetManager.bindAppWidgetIdIfAllowed(widgetId, componentName)

        if (canBind) {
            return try {
                launchConfigureIfNeeded(widgetId, reactContext)
            } catch (error: Exception) {
                deleteWidget(widgetId)
                val promise = Promise<Double>()
                promise.reject(error)
                promise
            }
        }

        // Need user permission — launch bind activity and return promise
        val promise = Promise<Double>()
        pendingBindPromise = promise
        pendingBindWidgetId = widgetId

        val activity = reactContext.currentActivity
        if (activity == null) {
            deleteWidget(widgetId)
            promise.reject(Error("No activity available"))
            return promise
        }

        reactContext.addActivityEventListener(object : ActivityEventListener {
            override fun onActivityResult(
                activity: Activity,
                requestCode: Int,
                resultCode: Int,
                data: Intent?
            ) {
                when (requestCode) {
                    REQUEST_BIND -> {
                        val boundWidgetId = pendingBindWidgetId
                        val pendingPromise = pendingBindPromise
                        pendingBindPromise = null
                        pendingBindWidgetId = -1

                        if (boundWidgetId < 0 || pendingPromise == null) {
                            reactContext.removeActivityEventListener(this)
                            return
                        }

                        if (resultCode == Activity.RESULT_OK) {
                            try {
                                continueConfigureFlow(boundWidgetId, pendingPromise, reactContext)
                            } catch (error: Exception) {
                                deleteWidget(boundWidgetId)
                                pendingPromise.reject(error)
                                clearPendingConfigureState()
                                reactContext.removeActivityEventListener(this)
                            }
                            return
                        }

                        deleteWidget(boundWidgetId)
                        pendingPromise.reject(Error("Widget bind cancelled"))
                        reactContext.removeActivityEventListener(this)
                    }

                    REQUEST_CONFIGURE -> {
                        val configuredWidgetId = pendingConfigureWidgetId
                        val pendingPromise = pendingConfigurePromise
                        clearPendingConfigureState()

                        if (configuredWidgetId < 0 || pendingPromise == null) {
                            reactContext.removeActivityEventListener(this)
                            return
                        }

                        if (resultCode == Activity.RESULT_OK) {
                            pendingPromise.resolve(configuredWidgetId.toDouble())
                        } else {
                            deleteWidget(configuredWidgetId)
                            pendingPromise.reject(Error("Widget configuration cancelled"))
                        }

                        reactContext.removeActivityEventListener(this)
                    }
                }
            }

            override fun onNewIntent(intent: Intent) {}
        })

        val intent = Intent(AppWidgetManager.ACTION_APPWIDGET_BIND).apply {
            putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, widgetId)
            putExtra(AppWidgetManager.EXTRA_APPWIDGET_PROVIDER, componentName)
        }
        activity.startActivityForResult(intent, REQUEST_BIND)

        return promise
    }

    fun deleteWidget(widgetId: Int) {
        try {
            widgetHost.deleteAppWidgetId(widgetId)
        } catch (_: Exception) {
            // Widget may already be gone
        }
    }

    fun createView(context: Context, widgetId: Int): TrackedAppWidgetHostView {
        startListeningSafely()
        val providerInfo = widgetManager.getAppWidgetInfo(widgetId)
            ?: throw Error("No AppWidgetProviderInfo found for widgetId=$widgetId")
        val view = widgetHost.createView(context, widgetId, providerInfo) as TrackedAppWidgetHostView
        view.setAppWidget(widgetId, providerInfo)
        return view
    }

    private fun launchConfigureIfNeeded(
        widgetId: Int,
        reactContext: ReactApplicationContext
    ): Promise<Double> {
        val promise = Promise<Double>()
        continueConfigureFlow(widgetId, promise, reactContext)
        return promise
    }

    private fun continueConfigureFlow(
        widgetId: Int,
        promise: Promise<Double>,
        reactContext: ReactApplicationContext
    ) {
        val providerInfo = widgetManager.getAppWidgetInfo(widgetId)

        if (providerInfo?.configure == null) {
            promise.resolve(widgetId.toDouble())
            return
        }

        val activity = reactContext.currentActivity
            ?: throw Error("No activity available")

        pendingConfigurePromise = promise
        pendingConfigureWidgetId = widgetId
        widgetHost.startAppWidgetConfigureActivityForResult(
            activity,
            widgetId,
            0,
            REQUEST_CONFIGURE,
            null
        )
    }

    private fun clearPendingConfigureState() {
        pendingConfigurePromise = null
        pendingConfigureWidgetId = -1
    }

    private fun startListeningSafely() {
        if (isListening) return
        try {
            widgetHost.startListening()
            isListening = true
        } catch (_: Exception) {
            // May throw if host is in bad state
        }
    }

    private fun stopListeningSafely() {
        if (!isListening) return
        try {
            widgetHost.stopListening()
            isListening = false
        } catch (_: Exception) {
            // Safe to ignore
        }
    }

    /** Custom AppWidgetHost that creates TrackedAppWidgetHostView instances */
    private class LauncherAppWidgetHost(
        context: Context,
        hostId: Int
    ) : AppWidgetHost(context, hostId) {
        override fun onCreateView(
            context: Context,
            appWidgetId: Int,
            appWidget: AppWidgetProviderInfo?
        ): AppWidgetHostView {
            return TrackedAppWidgetHostView(context)
        }
    }

    companion object {
        private const val HOST_ID = 1024
        private const val REQUEST_BIND = 2001
        private const val REQUEST_CONFIGURE = 2002

        @Volatile
        private var instance: AppWidgetHostManager? = null

        fun getInstance(context: Context): AppWidgetHostManager {
            return instance ?: synchronized(this) {
                instance ?: AppWidgetHostManager(context).also { instance = it }
            }
        }
    }
}
