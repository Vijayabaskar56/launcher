package com.margelo.nitro.launcherservice

import android.content.Context
import android.content.pm.LauncherApps
import android.content.pm.ShortcutInfo
import android.graphics.Bitmap
import android.os.Process
import java.io.File
import java.io.FileOutputStream

/**
 * Queries, searches, and launches app shortcuts via LauncherApps.
 *
 * Follows the Kvaesitso AppShortcutRepository pattern:
 * - Query per-package with ShortcutQuery
 * - Fuzzy search across all packages
 * - Launch via LauncherApps.startShortcut()
 */
class ShortcutProvider(private val context: Context) {

    private val launcherApps: LauncherApps by lazy {
        context.getSystemService(Context.LAUNCHER_APPS_SERVICE) as LauncherApps
    }

    private val cacheDir: File by lazy {
        File(context.cacheDir, "shortcuts").also { if (!it.exists()) it.mkdirs() }
    }

    val hasShortcutHostPermission: Boolean
        get() = try {
            launcherApps.hasShortcutHostPermission()
        } catch (_: Exception) {
            false
        }

    /**
     * Get shortcuts for a specific app package.
     */
    fun getShortcuts(packageName: String): Array<AppShortcut> {
        if (!hasShortcutHostPermission) return emptyArray()

        return try {
            val query = LauncherApps.ShortcutQuery()
                .setPackage(packageName)
                .setQueryFlags(
                    LauncherApps.ShortcutQuery.FLAG_MATCH_MANIFEST or
                    LauncherApps.ShortcutQuery.FLAG_MATCH_DYNAMIC or
                    LauncherApps.ShortcutQuery.FLAG_MATCH_PINNED
                )

            val shortcuts = launcherApps.getShortcuts(query, Process.myUserHandle())
            shortcuts?.map { toAppShortcut(it) }?.toTypedArray() ?: emptyArray()
        } catch (_: Exception) {
            emptyArray()
        }
    }

    /**
     * Search shortcuts across all packages by label matching.
     * Native-side filtering avoids sending all shortcuts across the bridge.
     */
    fun searchShortcuts(query: String): Array<AppShortcut> {
        if (!hasShortcutHostPermission) return emptyArray()
        if (query.length < 2) return emptyArray()

        val lowerQuery = query.lowercase()

        return try {
            val shortcutQuery = LauncherApps.ShortcutQuery()
                .setQueryFlags(
                    LauncherApps.ShortcutQuery.FLAG_MATCH_MANIFEST or
                    LauncherApps.ShortcutQuery.FLAG_MATCH_DYNAMIC
                )

            val shortcuts = launcherApps.getShortcuts(shortcutQuery, Process.myUserHandle())
            shortcuts
                ?.filter { matchesQuery(it, lowerQuery) }
                ?.take(MAX_SEARCH_RESULTS)
                ?.map { toAppShortcut(it) }
                ?.toTypedArray()
                ?: emptyArray()
        } catch (_: Exception) {
            emptyArray()
        }
    }

    fun launchShortcut(packageName: String, shortcutId: String) {
        try {
            launcherApps.startShortcut(
                packageName,
                shortcutId,
                null,
                null,
                Process.myUserHandle()
            )
        } catch (_: Exception) {
            // Shortcut may have been removed or permission denied
        }
    }

    private fun matchesQuery(shortcut: ShortcutInfo, lowerQuery: String): Boolean {
        val shortLabel = shortcut.shortLabel?.toString()?.lowercase()
        val longLabel = shortcut.longLabel?.toString()?.lowercase()
        return (shortLabel != null && shortLabel.contains(lowerQuery)) ||
               (longLabel != null && longLabel.contains(lowerQuery))
    }

    private fun toAppShortcut(shortcut: ShortcutInfo): AppShortcut {
        val iconPath = loadShortcutIcon(shortcut)

        return AppShortcut(
            id = shortcut.id,
            packageName = shortcut.`package`,
            shortLabel = shortcut.shortLabel?.toString() ?: shortcut.id,
            longLabel = shortcut.longLabel?.toString(),
            iconPath = iconPath,
        )
    }

    private fun loadShortcutIcon(shortcut: ShortcutInfo): String? {
        val file = File(cacheDir, "${shortcut.`package`}_${shortcut.id}.png")
        if (file.exists()) return file.absolutePath

        return try {
            val drawable = launcherApps.getShortcutIconDrawable(
                shortcut,
                context.resources.displayMetrics.densityDpi
            ) ?: return null

            val bitmap = compositeDrawable(drawable, SHORTCUT_ICON_SIZE)
            FileOutputStream(file).use { out ->
                bitmap.compress(Bitmap.CompressFormat.PNG, 90, out)
            }
            file.absolutePath
        } catch (_: Exception) {
            null
        }
    }

    companion object {
        private const val MAX_SEARCH_RESULTS = 20
        private const val SHORTCUT_ICON_SIZE = 192
    }
}
