package com.margelo.nitro.openclawgateway

import android.content.Context
import androidx.annotation.Keep
import com.facebook.proguard.annotations.DoNotStrip
import com.margelo.nitro.NitroModules
import com.margelo.nitro.core.Promise
import java.util.concurrent.Executors
import org.json.JSONObject

@Keep
@DoNotStrip
class HybridOpenClawGateway : HybridOpenClawGatewaySpec() {

    private val context: Context
        get() = NitroModules.applicationContext
            ?: throw Error("No ApplicationContext set!")

    private val prefs by lazy {
        context.getSharedPreferences("openclaw_gateway", Context.MODE_PRIVATE)
    }

    private val executor = Executors.newCachedThreadPool()

    @Volatile
    private var lastConnectionConfig: GatewayConnectionConfig? = null

    @Volatile
    private var session: GatewaySession? = null

    private var snapshot = OpenClawConnectionSnapshot(
        isConnected = false,
        endpointId = null,
        endpointUrl = null,
        mainSessionKey = null,
    )

    override fun parseSetupCode(raw: String): OpenClawSetupCodeConfig? {
        return parseGatewaySetupCode(raw)
    }

    override fun parseEndpoint(raw: String): OpenClawEndpointConfig? {
        return parseGatewayEndpoint(raw)
    }

    override fun probeTlsFingerprint(host: String, port: Double): Promise<OpenClawTlsProbeResult> {
        val promise = Promise<OpenClawTlsProbeResult>()
        executor.execute {
            runCatching {
                probeGatewayTlsFingerprint(host, port.toInt())
            }.onSuccess { result ->
                promise.resolve(result)
            }.onFailure { error ->
                promise.reject(Error(error.message ?: "TLS fingerprint probe failed"))
            }
        }
        return promise
    }

    override fun saveTrustedFingerprint(stableId: String, fingerprintSha256: String) {
        prefs.edit().putString(trustedFingerprintKey(stableId), fingerprintSha256.trim()).apply()
    }

    override fun getTrustedFingerprint(stableId: String): String? {
        return prefs.getString(trustedFingerprintKey(stableId), null)?.trim()?.takeIf { it.isNotEmpty() }
    }

    override fun clearTrustedFingerprint(stableId: String) {
        prefs.edit().remove(trustedFingerprintKey(stableId)).apply()
    }

    override fun connect(configJson: String) {
        val parsedConfig = parseConnectionConfig(configJson)
        lastConnectionConfig = parsedConfig

        session?.close()
        maybePerformBootstrapOperatorHandoff(parsedConfig)
        val nextSession =
            GatewaySession(
                context = context,
                config = parsedConfig,
                onConnected = { mainSessionKey ->
                    snapshot =
                        snapshot.copy(
                            isConnected = true,
                            mainSessionKey = mainSessionKey,
                        )
                },
                onDisconnected = {
                    snapshot =
                        snapshot.copy(
                            isConnected = false,
                            mainSessionKey = null,
                        )
                },
            )
        try {
            session = nextSession
            val mainSessionKey = nextSession.connect()
            snapshot =
                OpenClawConnectionSnapshot(
                    isConnected = true,
                    endpointId = parsedConfig.endpoint.stableId,
                    endpointUrl = parsedConfig.endpointUrl(),
                    mainSessionKey = mainSessionKey,
                )
        } catch (error: Throwable) {
            session = null
            snapshot =
                OpenClawConnectionSnapshot(
                    isConnected = false,
                    endpointId = parsedConfig.endpoint.stableId,
                    endpointUrl = parsedConfig.endpointUrl(),
                    mainSessionKey = null,
                )
            throw Error(error.message ?: "OpenClaw connect failed")
        }
    }

    override fun disconnect() {
        session?.close()
        session = null
        snapshot = snapshot.copy(
            isConnected = false,
            mainSessionKey = null,
        )
    }

    override fun reconnect() {
        val activeSession = session
        if (activeSession != null) {
            activeSession.reconnect()
            return
        }
        val config = lastConnectionConfig ?: throw Error("No previous OpenClaw connection.")
        connect(buildConnectionConfigJson(config))
    }

    override fun getConnectionSnapshot(): OpenClawConnectionSnapshot {
        return snapshot
    }

    override fun getConnectionState(): OpenClawConnectionState {
        return session?.getConnectionState()
            ?: OpenClawConnectionState(
                authBlocked = false,
                errorMessage = null,
                phase = "disconnected",
                statusMessage = "Offline",
            )
    }

    override fun request(rpcMethod: String, paramsJson: String?, timeoutMs: Double?): Promise<String> {
        val promise = Promise<String>()
        val activeSession = session
        if (activeSession == null || !snapshot.isConnected) {
            promise.reject(Error("OpenClaw gateway is not connected."))
            return promise
        }
        executor.execute {
            runCatching {
                activeSession.request(
                    method = rpcMethod,
                    paramsJson = paramsJson,
                    timeoutMs = timeoutMs?.toLong() ?: 15_000L,
                )
            }.onSuccess { response ->
                promise.resolve(response)
            }.onFailure { error ->
                promise.reject(Error(error.message ?: "OpenClaw request failed"))
            }
        }
        return promise
    }

    private fun trustedFingerprintKey(stableId: String): String {
        return "trusted_fingerprint:${stableId.trim()}"
    }

    private fun maybePerformBootstrapOperatorHandoff(config: GatewayConnectionConfig) {
        if (!requiresBootstrapOperatorHandoff(config)) {
            return
        }
        val bootstrapConfig =
            config.copy(
                options =
                    config.options.copy(
                        role = "node",
                        scopes = emptyList(),
                    ),
                token = null,
                password = null,
            )
        val bootstrapSession =
            GatewaySession(
                context = context,
                config = bootstrapConfig,
                onConnected = {},
                onDisconnected = {},
            )
        try {
            bootstrapSession.connect()
        } finally {
            bootstrapSession.close()
        }
    }

    private fun requiresBootstrapOperatorHandoff(config: GatewayConnectionConfig): Boolean {
        if (config.options.role != "operator") {
            return false
        }
        if (config.bootstrapToken.isNullOrBlank()) {
            return false
        }
        if (!config.token.isNullOrBlank() || !config.password.isNullOrBlank()) {
            return false
        }
        val identity = DeviceIdentityStore(context).loadOrCreate()
        val storedOperatorToken =
            DeviceAuthStore(prefs).loadToken(identity.deviceId, config.options.role)
        return storedOperatorToken.isNullOrBlank()
    }

    private fun parseConnectionConfig(configJson: String): GatewayConnectionConfig {
        val root = JSONObject(configJson)
        val endpointObject = root.optJSONObject("endpoint")
            ?: throw Error("Missing OpenClaw endpoint.")
        val host = endpointObject.optString("host").trim()
        val port = endpointObject.optInt("port")
        val tls = endpointObject.optBoolean("tls", false)
        val endpointId =
            root.optString("endpointId")
                .trim()
                .ifEmpty { throw Error("Missing OpenClaw endpointId.") }
        if (host.isEmpty() || port !in 1..65_535) {
            throw Error("Invalid OpenClaw endpoint.")
        }
        val auth = root.optJSONObject("auth")
        val token = auth?.optString("token")?.trim()?.takeIf { it.isNotEmpty() }
        val bootstrapToken = auth?.optString("bootstrapToken")?.trim()?.takeIf { it.isNotEmpty() }
        val password = auth?.optString("password")?.trim()?.takeIf { it.isNotEmpty() }
        val role = root.optString("role").trim().ifEmpty { "operator" }
        val scopesArray = root.optJSONArray("scopes")
        val scopes = buildList {
            if (scopesArray != null) {
                for (index in 0 until scopesArray.length()) {
                    val value = scopesArray.optString(index).trim()
                    if (value.isNotEmpty() && !contains(value)) {
                        add(value)
                    }
                }
            }
        }
        val locale = root.optString("locale").trim().ifEmpty { "en-US" }
        val capsArray = root.optJSONArray("caps")
        val caps = buildStringList(capsArray)
        val commandsArray = root.optJSONArray("commands")
        val commands = buildStringList(commandsArray)
        val permissionsObject = root.optJSONObject("permissions")
        val permissions = buildBooleanMap(permissionsObject)
        return GatewayConnectionConfig(
            endpoint =
                GatewayEndpoint(
                    host = host,
                    port = port,
                    tls = tls,
                    stableId = endpointId,
                ),
            options =
                GatewayConnectOptions(
                    role = role,
                    scopes = scopes,
                    locale = locale,
                    client = buildLauncherGatewayClientInfo(context),
                    userAgent = buildLauncherGatewayUserAgent(context),
                    caps = caps,
                    commands = commands,
                    permissions = permissions,
                ),
            token = token,
            bootstrapToken = bootstrapToken,
            password = password,
            expectedFingerprint =
                if (tls) {
                    getTrustedFingerprint(endpointId)
                } else {
                    null
                },
        )
    }

    private fun buildConnectionConfigJson(config: GatewayConnectionConfig): String {
        return JSONObject()
            .put(
                "endpoint",
                JSONObject()
                    .put("host", config.endpoint.host)
                    .put("port", config.endpoint.port)
                    .put("tls", config.endpoint.tls)
                    .put("displayUrl", config.endpointUrl()),
            )
            .put("endpointId", config.endpoint.stableId)
            .put("locale", config.options.locale ?: "en-US")
            .put("role", config.options.role)
            .put("scopes", org.json.JSONArray(config.options.scopes))
            .put("caps", org.json.JSONArray(config.options.caps))
            .put("commands", org.json.JSONArray(config.options.commands))
            .put("permissions", JSONObject(config.options.permissions))
            .put(
                "auth",
                JSONObject()
                    .putOpt("token", config.token)
                    .putOpt("bootstrapToken", config.bootstrapToken)
                    .putOpt("password", config.password),
            )
            .toString()
    }

    private fun GatewayConnectionConfig.endpointUrl(): String {
        val displayHost = if (endpoint.host.contains(":")) "[${endpoint.host}]" else endpoint.host
        val defaultPort = if (endpoint.tls) 443 else 80
        val scheme = if (endpoint.tls) "https" else "http"
        return if (endpoint.port == defaultPort) {
            "$scheme://$displayHost"
        } else {
            "$scheme://$displayHost:${endpoint.port}"
        }
    }

    private fun buildStringList(values: org.json.JSONArray?): List<String> {
        return buildList {
            if (values == null) {
                return@buildList
            }
            for (index in 0 until values.length()) {
                val value = values.optString(index).trim()
                if (value.isNotEmpty() && !contains(value)) {
                    add(value)
                }
            }
        }
    }

    private fun buildBooleanMap(values: JSONObject?): Map<String, Boolean> {
        if (values == null) {
            return emptyMap()
        }
        val entries = mutableMapOf<String, Boolean>()
        val keys = values.keys()
        while (keys.hasNext()) {
            val key = keys.next().trim()
            if (key.isEmpty()) {
                continue
            }
            entries[key] = values.optBoolean(key, false)
        }
        return entries.toSortedMap()
    }
}
