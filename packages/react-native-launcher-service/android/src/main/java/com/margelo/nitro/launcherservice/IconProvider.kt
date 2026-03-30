package com.margelo.nitro.launcherservice

import android.content.Context
import android.content.pm.PackageManager
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Paint
import android.graphics.PorterDuff
import android.graphics.PorterDuffColorFilter
import android.graphics.drawable.AdaptiveIconDrawable
import android.graphics.drawable.Drawable
import android.os.Build
import java.io.File
import java.io.FileOutputStream

/**
 * Extracts adaptive icon layers, composites them into a bitmap,
 * and caches to disk as PNG files.
 *
 * Follows the Kvaesitso pattern:
 * - Extract foreground/background/monochrome from AdaptiveIconDrawable
 * - For themed: use monochrome layer with tint, or tint foreground
 * - Composite to bitmap and save to cache/icons/{packageName}.png
 */
class IconProvider(
    private val context: Context,
    private val iconPackManager: IconPackManager,
) {

    private val cacheDir: File by lazy {
        File(context.cacheDir, "icons").also { if (!it.exists()) it.mkdirs() }
    }

    /**
     * Get a composited app icon saved as a PNG file.
     * Returns the absolute file path, or null on failure.
     */
    fun getAppIcon(packageName: String, size: Int, themed: Boolean): String? {
        // Check cache first
        val suffix = if (themed) "_themed" else ""
        val cacheFile = File(cacheDir, "${packageName}${suffix}_${size}.png")
        if (cacheFile.exists()) return cacheFile.absolutePath

        val drawable = resolveDrawable(packageName) ?: return null

        val bitmap = if (themed) {
            compositeThemedIcon(drawable, size)
        } else {
            compositeIcon(drawable, size)
        }

        return bitmap?.let { saveBitmap(it, cacheFile) }
    }

    fun clearIconCache() {
        cacheDir.listFiles()?.forEach { it.delete() }
    }

    /**
     * Resolve the icon drawable for an app.
     * Order: icon pack → system icon
     */
    private fun resolveDrawable(packageName: String): Drawable? {
        // Try icon pack first
        if (iconPackManager.isActive) {
            val activityName = getMainActivityName(packageName)
            if (activityName != null) {
                val packIcon = iconPackManager.getIconPackDrawable(packageName, activityName)
                if (packIcon != null) return packIcon
            }
        }

        // Fall back to system icon
        return try {
            context.packageManager.getApplicationIcon(packageName)
        } catch (_: PackageManager.NameNotFoundException) {
            null
        }
    }

    private fun compositeIcon(drawable: Drawable, size: Int): Bitmap {
        if (drawable !is AdaptiveIconDrawable && iconPackManager.isActive) {
            val masked = iconPackManager.generateMaskedIcon(drawable, size)
            if (masked != null) return masked
        }
        return compositeDrawable(drawable, size)
    }

    /**
     * Composite a themed (monochrome) icon.
     * For API 33+: uses AdaptiveIconDrawable.monochrome layer with tint.
     * Fallback: tints the foreground layer.
     */
    private fun compositeThemedIcon(drawable: Drawable, size: Int): Bitmap {
        val bitmap = Bitmap.createBitmap(size, size, Bitmap.Config.ARGB_8888)
        val canvas = Canvas(bitmap)

        val themeColor = getThemeColor()
        val bgColor = getThemeBgColor()

        // Draw themed background
        val bgPaint = Paint(Paint.ANTI_ALIAS_FLAG)
        bgPaint.color = bgColor
        canvas.drawCircle(size / 2f, size / 2f, size / 2f, bgPaint)

        if (drawable is AdaptiveIconDrawable) {
            val monochromeDrawable = if (Build.VERSION.SDK_INT >= 33) {
                drawable.monochrome
            } else {
                null
            }

            val fgDrawable = monochromeDrawable ?: drawable.foreground

            if (fgDrawable != null) {
                fgDrawable.setBounds(0, 0, size, size)
                fgDrawable.colorFilter = PorterDuffColorFilter(themeColor, PorterDuff.Mode.SRC_IN)
                fgDrawable.draw(canvas)
                fgDrawable.colorFilter = null
            }
        } else {
            // Legacy icon — tint the whole thing
            drawable.setBounds(
                (size * 0.15f).toInt(),
                (size * 0.15f).toInt(),
                (size * 0.85f).toInt(),
                (size * 0.85f).toInt(),
            )
            drawable.colorFilter = PorterDuffColorFilter(themeColor, PorterDuff.Mode.SRC_IN)
            drawable.draw(canvas)
            drawable.colorFilter = null
        }

        return bitmap
    }

    private fun getSystemColor(name: String, fallback: Int): Int {
        return try {
            val resId = context.resources.getIdentifier(name, "color", "android")
            if (resId != 0) context.getColor(resId) else fallback
        } catch (_: Exception) {
            fallback
        }
    }

    private fun getThemeColor(): Int =
        getSystemColor("system_accent1_100", DEFAULT_THEME_COLOR)

    private fun getThemeBgColor(): Int =
        getSystemColor("system_accent1_800", DEFAULT_THEME_BG_COLOR)

    private fun getMainActivityName(packageName: String): String? {
        return try {
            val intent = context.packageManager.getLaunchIntentForPackage(packageName)
            intent?.component?.className
        } catch (_: Exception) {
            null
        }
    }

    private fun saveBitmap(bitmap: Bitmap, file: File): String? {
        return try {
            FileOutputStream(file).use { out ->
                bitmap.compress(Bitmap.CompressFormat.PNG, 90, out)
            }
            file.absolutePath
        } catch (_: Exception) {
            null
        }
    }

    companion object {
        private const val DEFAULT_THEME_COLOR = 0xFF6750A4.toInt()
        private const val DEFAULT_THEME_BG_COLOR = 0xFF1D1B20.toInt()
    }
}

/** Composite a drawable (adaptive or legacy) into a bitmap at the given size. */
internal fun compositeDrawable(drawable: Drawable, size: Int): Bitmap {
    val bitmap = Bitmap.createBitmap(size, size, Bitmap.Config.ARGB_8888)
    val canvas = Canvas(bitmap)

    if (drawable is AdaptiveIconDrawable) {
        drawable.background?.let { bg ->
            bg.setBounds(0, 0, size, size)
            bg.draw(canvas)
        }
        drawable.foreground?.let { fg ->
            fg.setBounds(0, 0, size, size)
            fg.draw(canvas)
        }
    } else {
        drawable.setBounds(0, 0, size, size)
        drawable.draw(canvas)
    }

    return bitmap
}
