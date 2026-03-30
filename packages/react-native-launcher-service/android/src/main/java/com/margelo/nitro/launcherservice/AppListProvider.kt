package com.margelo.nitro.launcherservice

import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.content.pm.ResolveInfo

/**
 * Queries installed apps with launch intents from PackageManager.
 * Replaces react-native-get-app-list.
 */
class AppListProvider(private val context: Context) {

    fun getInstalledApps(): Array<AppInfo> {
        val pm = context.packageManager
        val mainIntent = Intent(Intent.ACTION_MAIN, null).apply {
            addCategory(Intent.CATEGORY_LAUNCHER)
        }

        val resolveInfos: List<ResolveInfo> = pm.queryIntentActivities(mainIntent, 0)

        return resolveInfos.mapNotNull { resolveInfo ->
            val activityInfo = resolveInfo.activityInfo ?: return@mapNotNull null
            val packageName = activityInfo.packageName ?: return@mapNotNull null
            val activityName = activityInfo.name ?: return@mapNotNull null
            val appName = resolveInfo.loadLabel(pm)?.toString() ?: packageName

            AppInfo(
                packageName = packageName,
                appName = appName,
                activityName = activityName,
            )
        }
        .distinctBy { it.packageName }
        .sortedBy { it.appName.lowercase() }
        .toTypedArray()
    }
}
