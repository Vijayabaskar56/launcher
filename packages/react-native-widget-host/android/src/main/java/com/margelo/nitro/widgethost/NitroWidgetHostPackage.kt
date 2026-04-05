package com.margelo.nitro.widgethost

import com.facebook.react.BaseReactPackage
import com.facebook.react.bridge.ModuleSpec
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.module.model.ReactModuleInfoProvider
import com.margelo.nitro.widgethost.views.HybridAppWidgetViewManager

class NitroWidgetHostPackage : BaseReactPackage() {
    override fun getModule(name: String, reactContext: ReactApplicationContext): NativeModule? = null

    override fun getViewManagers(reactContext: ReactApplicationContext): List<ModuleSpec> =
        listOf(ModuleSpec.viewManagerSpec { HybridAppWidgetViewManager() })

    override fun getReactModuleInfoProvider(): ReactModuleInfoProvider = ReactModuleInfoProvider { HashMap() }

    companion object {
        init {
            NitroWidgetHostOnLoad.initializeNative()
        }
    }
}
