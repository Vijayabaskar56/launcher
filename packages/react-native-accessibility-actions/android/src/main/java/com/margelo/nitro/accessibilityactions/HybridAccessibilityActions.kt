package com.margelo.nitro.accessibilityactions

import android.accessibilityservice.AccessibilityService
import android.content.Context
import android.content.Intent
import android.provider.Settings
import android.text.TextUtils
import androidx.annotation.Keep
import com.facebook.proguard.annotations.DoNotStrip
import com.margelo.nitro.NitroModules

@Keep
@DoNotStrip
class HybridAccessibilityActions : HybridAccessibilityActionsSpec() {

    private val context: Context
        get() = NitroModules.applicationContext
            ?: throw Error("No ApplicationContext set!")

    override val isAccessibilityEnabled: Boolean
        get() {
            val enabledServices = Settings.Secure.getString(
                context.contentResolver,
                Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES
            ) ?: return false
            val colonSplitter = TextUtils.SimpleStringSplitter(':')
            colonSplitter.setString(enabledServices)
            val serviceName = "${context.packageName}/${LauncherAccessibilityService::class.java.canonicalName}"
            while (colonSplitter.hasNext()) {
                if (colonSplitter.next().equals(serviceName, ignoreCase = true)) {
                    return true
                }
            }
            return false
        }

    override fun lockScreen() {
        val service = getServiceOrThrow()
        service.performGlobalAction(AccessibilityService.GLOBAL_ACTION_LOCK_SCREEN)
    }

    override fun openNotifications() {
        val service = getServiceOrThrow()
        service.performGlobalAction(AccessibilityService.GLOBAL_ACTION_NOTIFICATIONS)
    }

    override fun openQuickSettings() {
        val service = getServiceOrThrow()
        service.performGlobalAction(AccessibilityService.GLOBAL_ACTION_QUICK_SETTINGS)
    }

    override fun openRecents() {
        val service = getServiceOrThrow()
        service.performGlobalAction(AccessibilityService.GLOBAL_ACTION_RECENTS)
    }

    override fun showPowerMenu() {
        val service = getServiceOrThrow()
        service.performGlobalAction(AccessibilityService.GLOBAL_ACTION_POWER_DIALOG)
    }

    override fun openAccessibilitySettings() {
        val intent = Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS)
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        context.startActivity(intent)
    }

    private fun getServiceOrThrow(): LauncherAccessibilityService {
        return LauncherAccessibilityService.instance
            ?: throw Error("AccessibilityService is not enabled. Please enable it in Settings > Accessibility.")
    }
}
