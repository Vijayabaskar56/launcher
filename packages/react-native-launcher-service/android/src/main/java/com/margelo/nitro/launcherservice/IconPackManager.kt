package com.margelo.nitro.launcherservice

import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.content.res.Resources
import android.content.res.XmlResourceParser
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Paint
import android.graphics.PorterDuff
import android.graphics.PorterDuffXfermode
import android.graphics.drawable.Drawable
import org.xmlpull.v1.XmlPullParser

/**
 * Discovers installed icon packs, parses appfilter.xml, and resolves
 * icon pack icons for apps.
 *
 * Follows the Kvaesitso AppFilterIconPackInstaller pattern:
 * - Discover by intent filters (ADW, Nova, Lawnchair)
 * - Parse appfilter.xml for component→drawable mappings
 * - Store in-memory HashMap, cleared on icon pack change
 */
class IconPackManager(private val context: Context) {

    // In-memory icon pack state
    private var activePackageName: String? = null
    private var iconMappings = HashMap<String, String>() // componentKey → drawableName
    private var iconPackResources: Resources? = null
    private var iconPackPackageName: String? = null

    // Icon pack mask/back/upon/scale for generative icons
    private var iconBack: List<Bitmap> = emptyList()
    private var iconUpon: List<Bitmap> = emptyList()
    private var iconMask: Bitmap? = null
    private var iconScale: Float = 1.0f

    fun getInstalledIconPacks(): Array<IconPackInfo> {
        val pm = context.packageManager
        val packs = mutableListOf<IconPackInfo>()
        val seen = mutableSetOf<String>()

        for (action in ICON_PACK_ACTIONS) {
            val intent = Intent(action)
            val resolveInfos = pm.queryIntentActivities(intent, PackageManager.MATCH_ALL)
            for (ri in resolveInfos) {
                val pkg = ri.activityInfo?.packageName ?: continue
                if (seen.add(pkg)) {
                    val label = ri.loadLabel(pm)?.toString() ?: pkg
                    packs.add(IconPackInfo(packageName = pkg, label = label))
                }
            }
        }

        return packs.sortedBy { it.label.lowercase() }.toTypedArray()
    }

    fun setActiveIconPack(packageName: String?) {
        activePackageName = packageName
        iconMappings.clear()
        iconPackResources = null
        iconPackPackageName = null
        iconBack = emptyList()
        iconUpon = emptyList()
        iconMask = null
        iconScale = 1.0f

        if (packageName == null) return

        try {
            val pm = context.packageManager
            iconPackResources = pm.getResourcesForApplication(packageName)
            iconPackPackageName = packageName
            parseAppFilter(packageName)
        } catch (_: Exception) {
            // Icon pack not found or can't be parsed
        }
    }

    /**
     * Try to get an icon from the active icon pack for the given component.
     * Returns null if no icon pack is active or no match is found.
     */
    fun getIconPackDrawable(packageName: String, activityName: String): Drawable? {
        if (activePackageName == null) return null
        val res = iconPackResources ?: return null
        val packPkg = iconPackPackageName ?: return null

        // Exact match: package/activity
        val exactKey = "$packageName/$activityName"
        val drawableName = iconMappings[exactKey]
            ?: iconMappings[packageName] // Package-only fallback
            ?: return null

        return try {
            val resId = res.getIdentifier(drawableName, "drawable", packPkg)
            if (resId != 0) res.getDrawable(resId, null) else null
        } catch (_: Exception) {
            null
        }
    }

    /**
     * Generate an icon by applying iconback/iconupon/iconmask to a base icon.
     * Used when the icon pack doesn't have a specific icon for the app.
     */
    fun generateMaskedIcon(baseIcon: Drawable, size: Int): Bitmap? {
        if (iconBack.isEmpty() && iconUpon.isEmpty() && iconMask == null) return null

        val bitmap = Bitmap.createBitmap(size, size, Bitmap.Config.ARGB_8888)
        val canvas = Canvas(bitmap)
        val paint = Paint(Paint.ANTI_ALIAS_FLAG or Paint.FILTER_BITMAP_FLAG)

        // Draw base icon scaled
        val scaledSize = (size * iconScale).toInt()
        val offset = (size - scaledSize) / 2
        baseIcon.setBounds(offset, offset, offset + scaledSize, offset + scaledSize)
        baseIcon.draw(canvas)

        // Apply mask (cut out)
        if (iconMask != null) {
            paint.xfermode = PorterDuffXfermode(PorterDuff.Mode.DST_OUT)
            canvas.drawBitmap(iconMask!!, null, android.graphics.RectF(0f, 0f, size.toFloat(), size.toFloat()), paint)
        }

        // Apply upon (overlay on top)
        if (iconUpon.isNotEmpty()) {
            paint.xfermode = PorterDuffXfermode(PorterDuff.Mode.SRC_OVER)
            val upon = iconUpon[0]
            canvas.drawBitmap(upon, null, android.graphics.RectF(0f, 0f, size.toFloat(), size.toFloat()), paint)
        }

        // Apply back (behind)
        if (iconBack.isNotEmpty()) {
            val result = Bitmap.createBitmap(size, size, Bitmap.Config.ARGB_8888)
            val resultCanvas = Canvas(result)
            val resultPaint = Paint(Paint.ANTI_ALIAS_FLAG or Paint.FILTER_BITMAP_FLAG)
            val back = iconBack[(Math.random() * iconBack.size).toInt()]
            resultCanvas.drawBitmap(back, null, android.graphics.RectF(0f, 0f, size.toFloat(), size.toFloat()), resultPaint)
            resultPaint.xfermode = PorterDuffXfermode(PorterDuff.Mode.SRC_OVER)
            resultCanvas.drawBitmap(bitmap, 0f, 0f, resultPaint)
            return result
        }

        return bitmap
    }

    val isActive: Boolean get() = activePackageName != null

    private fun parseAppFilter(packageName: String) {
        val res = iconPackResources ?: return

        // Try xml/appfilter, then raw/appfilter, then assets
        val parser = tryGetXmlParser(res, packageName, "xml", "appfilter")
            ?: tryGetXmlParser(res, packageName, "raw", "appfilter")
            ?: return

        try {
            var eventType = parser.eventType
            while (eventType != XmlPullParser.END_DOCUMENT) {
                if (eventType == XmlPullParser.START_TAG) {
                    when (parser.name) {
                        "item" -> parseItem(parser)
                        "iconback" -> iconBack = parseImgAttributes(parser, res, packageName)
                        "iconupon" -> iconUpon = parseImgAttributes(parser, res, packageName)
                        "iconmask" -> parseIconMask(parser, res, packageName)
                        "scale" -> parseScale(parser)
                    }
                }
                eventType = parser.next()
            }
        } catch (_: Exception) {
            // Parsing error — use whatever we got
        } finally {
            parser.close()
        }
    }

    private fun parseItem(parser: XmlPullParser) {
        val component = parser.getAttributeValue(null, "component") ?: return
        val drawable = parser.getAttributeValue(null, "drawable") ?: return

        // Parse ComponentInfo{package/activity} format
        val match = COMPONENT_PATTERN.find(component) ?: return
        val componentKey = match.groupValues[1]
        iconMappings[componentKey] = drawable

        // Also store by package name only for fallback
        val slashIndex = componentKey.indexOf('/')
        if (slashIndex > 0) {
            val pkg = componentKey.substring(0, slashIndex)
            if (!iconMappings.containsKey(pkg)) {
                iconMappings[pkg] = drawable
            }
        }
    }

    private fun parseImgAttributes(parser: XmlPullParser, res: Resources, pkg: String): List<Bitmap> {
        val bitmaps = mutableListOf<Bitmap>()
        for (i in 0 until parser.attributeCount) {
            if (parser.getAttributeName(i).startsWith("img")) {
                loadBitmap(res, pkg, parser.getAttributeValue(i))?.let { bitmaps.add(it) }
            }
        }
        return bitmaps
    }

    private fun parseIconMask(parser: XmlPullParser, res: Resources, pkg: String) {
        for (i in 0 until parser.attributeCount) {
            val name = parser.getAttributeName(i)
            if (name.startsWith("img")) {
                val drawableName = parser.getAttributeValue(i)
                iconMask = loadBitmap(res, pkg, drawableName)
                return
            }
        }
    }

    private fun parseScale(parser: XmlPullParser) {
        val factor = parser.getAttributeValue(null, "factor")
        if (factor != null) {
            iconScale = factor.toFloatOrNull() ?: 1.0f
        }
    }

    private fun loadBitmap(res: Resources, pkg: String, drawableName: String): Bitmap? {
        return try {
            val resId = res.getIdentifier(drawableName, "drawable", pkg)
            if (resId == 0) return null
            val drawable = res.getDrawable(resId, null) ?: return null
            val bitmap = Bitmap.createBitmap(
                drawable.intrinsicWidth.coerceAtLeast(1),
                drawable.intrinsicHeight.coerceAtLeast(1),
                Bitmap.Config.ARGB_8888
            )
            val canvas = Canvas(bitmap)
            drawable.setBounds(0, 0, canvas.width, canvas.height)
            drawable.draw(canvas)
            bitmap
        } catch (_: Exception) {
            null
        }
    }

    private fun tryGetXmlParser(res: Resources, pkg: String, type: String, name: String): XmlResourceParser? {
        return try {
            val resId = res.getIdentifier(name, type, pkg)
            if (resId != 0) res.getXml(resId) else null
        } catch (_: Exception) {
            null
        }
    }

    companion object {
        private val ICON_PACK_ACTIONS = listOf(
            "org.adw.ActivityStarter.THEMES",
            "com.novalauncher.THEME",
            "app.lawnchair.icons.THEMED_ICON",
            "org.adw.launcher.THEMES",
        )

        private val COMPONENT_PATTERN = Regex("ComponentInfo\\{(.+?)\\}")
    }
}
