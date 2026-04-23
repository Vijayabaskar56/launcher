package com.margelo.nitro.openclawgateway

import java.net.URI
import java.util.Base64
import java.util.Locale
import org.json.JSONObject

private const val DEFAULT_TLS_PORT = 443
private const val DEFAULT_CLEAR_PORT = 18_789
private val BASE64_PADDING_REGEX = Regex("=+$")

internal fun parseGatewayEndpoint(rawInput: String): OpenClawEndpointConfig? {
    val raw = rawInput.trim()
    if (raw.isEmpty()) return null

    val normalized = if (raw.contains("://")) raw else "https://$raw"
    val uri = runCatching { URI(normalized) }.getOrNull() ?: return null
    val host = uri.host?.trim()?.trim('[', ']').orEmpty()
    if (host.isEmpty()) return null

    val scheme = uri.scheme?.trim()?.lowercase(Locale.US).orEmpty()
    val tls =
        when (scheme) {
            "ws", "http" -> false
            "wss", "https" -> true
            else -> true
        }
    if (!tls && !isPrivateLanGatewayHost(host)) {
        return null
    }
    val defaultPort =
        when (scheme) {
            "ws", "http" -> DEFAULT_CLEAR_PORT
            else -> DEFAULT_TLS_PORT
        }
    val displayPort =
        when (scheme) {
            "ws", "http" -> 80
            else -> DEFAULT_TLS_PORT
        }
    val port = uri.port.takeIf { it in 1..65_535 } ?: defaultPort
    val displayHost = if (host.contains(":")) "[$host]" else host
    val displayUrl =
        if (port == displayPort && defaultPort == displayPort) {
            "${if (tls) "https" else "http"}://$displayHost"
        } else {
            "${if (tls) "https" else "http"}://$displayHost:$port"
        }

    return OpenClawEndpointConfig(
        host = host,
        port = port.toDouble(),
        tls = tls,
        displayUrl = displayUrl,
    )
}

internal fun parseGatewaySetupCode(rawInput: String): OpenClawSetupCodeConfig? {
    val trimmed = rawInput.trim()
    if (trimmed.isEmpty()) return null

    val normalized =
        trimmed
            .replace('-', '+')
            .replace('_', '/')
            .replace(BASE64_PADDING_REGEX, "")
    val padded =
        if (normalized.length % 4 == 0) {
            normalized
        } else {
            normalized + "=".repeat(4 - (normalized.length % 4))
        }

    return try {
        val decoded = String(Base64.getDecoder().decode(padded), Charsets.UTF_8)
        val json = JSONObject(decoded)
        val url = json.optString("url").trim()
        if (url.isEmpty()) {
            null
        } else {
            val endpoint = parseGatewayEndpoint(url) ?: return null
            OpenClawSetupCodeConfig(
                url = url,
                bootstrapToken = json.optTrimmedString("bootstrapToken"),
                token = json.optTrimmedString("token"),
                password = json.optTrimmedString("password"),
                endpoint = endpoint,
            )
        }
    } catch (_: Throwable) {
        null
    }
}

private fun JSONObject.optTrimmedString(key: String): String? {
    val value = optString(key).trim()
    return value.ifEmpty { null }
}
