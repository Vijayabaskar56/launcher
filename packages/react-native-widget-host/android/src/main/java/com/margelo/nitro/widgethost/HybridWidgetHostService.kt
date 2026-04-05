package com.margelo.nitro.widgethost

import android.content.Context
import androidx.annotation.Keep
import com.facebook.proguard.annotations.DoNotStrip
import com.facebook.react.bridge.ReactApplicationContext
import com.margelo.nitro.NitroModules
import com.margelo.nitro.core.Promise

@Keep
@DoNotStrip
class HybridWidgetHostService : HybridWidgetHostServiceSpec() {

    private val context: Context
        get() = NitroModules.applicationContext
            ?: throw Error("No ApplicationContext set!")

    private val manager: AppWidgetHostManager by lazy {
        AppWidgetHostManager.getInstance(context)
    }

    override fun getInstalledWidgetProviders(): Array<WidgetProviderInfo> {
        return manager.getInstalledWidgetProviders()
    }

    override fun allocateAndBindWidget(provider: String): Promise<Double> {
        val reactContext = NitroModules.applicationContext as? ReactApplicationContext
            ?: return Promise.resolved((-1).toDouble())
        return manager.allocateAndBindWidget(provider, reactContext)
    }

    override fun deleteWidget(widgetId: Double) {
        manager.deleteWidget(widgetId.toInt())
    }
}
