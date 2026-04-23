package com.margelo.nitro.openclawgateway

import android.content.SharedPreferences
import org.json.JSONArray
import org.json.JSONObject
import java.util.Locale

internal data class DeviceAuthEntry(
    val token: String,
    val role: String,
    val scopes: List<String>,
    val updatedAtMs: Long,
)

internal class DeviceAuthStore(
    private val prefs: SharedPreferences,
) {
    fun loadEntry(deviceId: String, role: String): DeviceAuthEntry? {
        val key = tokenKey(deviceId, role)
        val token = prefs.getString(key, null)?.trim()?.takeIf { it.isNotEmpty() } ?: return null
        val metadata =
            prefs.getString(metadataKey(deviceId, role), null)
                ?.let(::parseMetadata)
        return DeviceAuthEntry(
            token = token,
            role = normalizeRole(role),
            scopes = metadata?.scopes ?: emptyList(),
            updatedAtMs = metadata?.updatedAtMs ?: 0L,
        )
    }

    fun loadToken(deviceId: String, role: String): String? {
        return loadEntry(deviceId, role)?.token
    }

    fun saveToken(deviceId: String, role: String, token: String, scopes: List<String> = emptyList()) {
        val normalizedScopes = normalizeScopes(scopes)
        prefs.edit()
            .putString(tokenKey(deviceId, role), token.trim())
            .putString(
                metadataKey(deviceId, role),
                JSONObject()
                    .put("scopes", JSONArray(normalizedScopes))
                    .put("updatedAtMs", System.currentTimeMillis())
                    .toString(),
            )
            .apply()
    }

    fun clearToken(deviceId: String, role: String) {
        prefs.edit()
            .remove(tokenKey(deviceId, role))
            .remove(metadataKey(deviceId, role))
            .apply()
    }

    private fun tokenKey(deviceId: String, role: String): String {
        val normalizedDeviceId = normalizeDeviceId(deviceId)
        val normalizedRole = normalizeRole(role)
        return "openclaw.gateway.device-token.$normalizedDeviceId.$normalizedRole"
    }

    private fun metadataKey(deviceId: String, role: String): String {
        val normalizedDeviceId = normalizeDeviceId(deviceId)
        val normalizedRole = normalizeRole(role)
        return "openclaw.gateway.device-token-meta.$normalizedDeviceId.$normalizedRole"
    }

    private fun normalizeDeviceId(deviceId: String): String {
        return deviceId.trim().lowercase(Locale.US)
    }

    private fun normalizeRole(role: String): String {
        return role.trim().lowercase(Locale.US)
    }

    private fun normalizeScopes(scopes: List<String>): List<String> {
        return scopes
            .map { it.trim() }
            .filter { it.isNotEmpty() }
            .distinct()
            .sorted()
    }

    private fun parseMetadata(raw: String): DeviceAuthMetadata? {
        return runCatching {
            val json = JSONObject(raw)
            DeviceAuthMetadata(
                scopes =
                    json.optJSONArray("scopes")
                        ?.let(::readScopes)
                        ?: emptyList(),
                updatedAtMs = json.optLong("updatedAtMs", 0L),
            )
        }.getOrNull()
    }

    private fun readScopes(array: JSONArray): List<String> {
        val scopes = mutableListOf<String>()
        for (index in 0 until array.length()) {
            val value = array.optString(index).trim()
            if (value.isNotEmpty() && value !in scopes) {
                scopes += value
            }
        }
        return scopes.sorted()
    }
}

private data class DeviceAuthMetadata(
    val scopes: List<String>,
    val updatedAtMs: Long,
)
