package com.margelo.nitro.launcherservice

import android.content.Context
import android.os.Build
import android.view.WindowManager
import androidx.annotation.Keep
import com.facebook.proguard.annotations.DoNotStrip
import com.facebook.react.bridge.ReactApplicationContext
import com.margelo.nitro.NitroModules

@Keep
@DoNotStrip
class HybridLauncherService : HybridLauncherServiceSpec() {

    private val context: Context
        get() = NitroModules.applicationContext
            ?: throw Error("No ApplicationContext set!")

    private val iconPackManager: IconPackManager by lazy {
        IconPackManager(context)
    }

    private val appListProvider: AppListProvider by lazy {
        AppListProvider(context)
    }

    private val iconProvider: IconProvider by lazy {
        IconProvider(context, iconPackManager)
    }

    private val shortcutProvider: ShortcutProvider by lazy {
        ShortcutProvider(context)
    }

    // --- App list ---

    override fun getInstalledApps(): Array<AppInfo> {
        return appListProvider.getInstalledApps()
    }

    // --- Icons ---

    override fun getAppIcon(packageName: String, size: Double, themed: Boolean): String? {
        return iconProvider.getAppIcon(packageName, size.toInt(), themed)
    }

    override fun clearIconCache() {
        iconProvider.clearIconCache()
    }

    // --- Icon packs ---

    override fun getInstalledIconPacks(): Array<IconPackInfo> {
        return iconPackManager.getInstalledIconPacks()
    }

    override fun setActiveIconPack(packageName: String?) {
        iconPackManager.setActiveIconPack(packageName)
        iconProvider.clearIconCache()
    }

    // --- Shortcuts ---

    override fun getShortcuts(packageName: String): Array<AppShortcut> {
        return shortcutProvider.getShortcuts(packageName)
    }

    override fun searchShortcuts(query: String): Array<AppShortcut> {
        return shortcutProvider.searchShortcuts(query)
    }

    override fun launchShortcut(packageName: String, shortcutId: String) {
        shortcutProvider.launchShortcut(packageName, shortcutId)
    }

    override val hasShortcutHostPermission: Boolean
        get() = shortcutProvider.hasShortcutHostPermission

    // --- Wallpaper blur ---

    override fun setWallpaperBlurRadius(radius: Double) {
        if (Build.VERSION.SDK_INT < 31) return

        val reactContext = NitroModules.applicationContext as? ReactApplicationContext ?: return
        val activity = reactContext.currentActivity ?: return

        activity.runOnUiThread {
            val window = activity.window ?: return@runOnUiThread
            val radiusPx = (radius * activity.resources.displayMetrics.density).toInt()

            if (radiusPx > 0) {
                window.addFlags(WindowManager.LayoutParams.FLAG_BLUR_BEHIND)
                window.attributes = window.attributes.also {
                    it.blurBehindRadius = radiusPx
                }
                window.setBackgroundBlurRadius(radiusPx)
            } else {
                window.clearFlags(WindowManager.LayoutParams.FLAG_BLUR_BEHIND)
                window.setBackgroundBlurRadius(0)
            }
        }
    }

    override val isWallpaperBlurSupported: Boolean
        get() = Build.VERSION.SDK_INT >= 31
}
