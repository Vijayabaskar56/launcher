package com.margelo.nitro.openclawgateway

import android.content.Context
import android.os.Build
import java.util.Locale
import java.util.UUID
import java.util.concurrent.CompletableFuture
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.ExecutorService
import java.util.concurrent.Executors
import java.util.concurrent.Future
import java.util.concurrent.TimeUnit
import java.util.concurrent.TimeoutException
import java.util.concurrent.atomic.AtomicBoolean
import java.util.concurrent.atomic.AtomicLong
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.Response
import okhttp3.WebSocket
import okhttp3.WebSocketListener
import org.json.JSONArray
import org.json.JSONObject
import org.json.JSONTokener

private const val GATEWAY_PROTOCOL_VERSION = 3
private const val CONNECT_CHALLENGE_TIMEOUT_MS = 2_000L
private const val CONNECT_REQUEST_TIMEOUT_MS = 12_000L
private const val DEFAULT_REQUEST_TIMEOUT_MS = 15_000L

internal data class GatewayClientInfo(
    val id: String,
    val displayName: String?,
    val version: String,
    val platform: String,
    val mode: String,
    val instanceId: String?,
    val deviceFamily: String?,
    val modelIdentifier: String?,
)

internal data class GatewayConnectOptions(
    val role: String,
    val scopes: List<String>,
    val locale: String?,
    val client: GatewayClientInfo,
    val userAgent: String?,
    val caps: List<String> = emptyList(),
    val commands: List<String> = emptyList(),
    val permissions: Map<String, Boolean> = emptyMap(),
)

internal data class GatewayEndpoint(
    val host: String,
    val port: Int,
    val tls: Boolean,
    val stableId: String,
)

internal data class GatewayConnectionConfig(
    val endpoint: GatewayEndpoint,
    val options: GatewayConnectOptions,
    val token: String?,
    val bootstrapToken: String?,
    val password: String?,
    val expectedFingerprint: String?,
)

private enum class GatewayConnectAuthSource {
    DEVICE_TOKEN,
    SHARED_TOKEN,
    BOOTSTRAP_TOKEN,
    PASSWORD,
    NONE,
}

private data class GatewayConnectErrorDetails(
    val code: String?,
    val canRetryWithDeviceToken: Boolean,
    val recommendedNextStep: String?,
    val reason: String?,
)

private data class GatewayErrorShape(
    val code: String,
    val message: String,
    val details: GatewayConnectErrorDetails? = null,
)

private data class GatewayRpcResponse(
    val ok: Boolean,
    val payloadJson: String?,
    val error: GatewayErrorShape?,
)

private data class SelectedConnectAuth(
    val authToken: String?,
    val authBootstrapToken: String?,
    val authDeviceToken: String?,
    val authPassword: String?,
    val signatureToken: String?,
    val authSource: GatewayConnectAuthSource,
    val attemptedDeviceTokenRetry: Boolean,
)

private data class ActiveConnection(
    val id: Long,
    val client: OkHttpClient,
    val socket: WebSocket,
    val challengeFuture: CompletableFuture<String>,
    val pending: ConcurrentHashMap<String, CompletableFuture<GatewayRpcResponse>> = ConcurrentHashMap(),
    val disposed: AtomicBoolean = AtomicBoolean(false),
    val didConnect: AtomicBoolean = AtomicBoolean(false),
)

internal class GatewaySession(
    context: Context,
    private val config: GatewayConnectionConfig,
    private val onConnected: (mainSessionKey: String?) -> Unit,
    private val onDisconnected: () -> Unit,
) {
    private val identityStore = DeviceIdentityStore(context)
    private val deviceAuthStore =
        DeviceAuthStore(
            context.getSharedPreferences("openclaw_gateway", Context.MODE_PRIVATE),
        )
    private val reconnectExecutor: ExecutorService = Executors.newSingleThreadExecutor()
    private val connectionIds = AtomicLong(0L)
    private val reconnectLock = Any()

    @Volatile
    private var currentConnection: ActiveConnection? = null

    @Volatile
    private var reconnectTask: Future<*>? = null

    @Volatile
    private var allowReconnect = false

    @Volatile
    private var sessionClosed = false

    @Volatile
    private var reconnectPausedForAuthFailure = false

    @Volatile
    private var pendingDeviceTokenRetry = false

    @Volatile
    private var deviceTokenRetryBudgetUsed = false

    @Volatile
    private var connectionPhase = "disconnected"

    @Volatile
    private var connectionStatusMessage: String? = "Offline"

    @Volatile
    private var connectionErrorMessage: String? = null

    @Volatile
    private var connectionAuthBlocked = false

    fun connect(): String? {
        synchronized(reconnectLock) {
            sessionClosed = false
            allowReconnect = true
            reconnectPausedForAuthFailure = false
            pendingDeviceTokenRetry = false
            deviceTokenRetryBudgetUsed = false
            cancelReconnectTaskLocked()
        }
        updateConnectionState(
            phase = "connecting",
            statusMessage = "Connecting…",
            errorMessage = null,
            authBlocked = false,
        )
        disposeConnection(currentConnection)
        return connectBlocking()
    }

    fun reconnect() {
        synchronized(reconnectLock) {
            sessionClosed = false
            allowReconnect = true
            reconnectPausedForAuthFailure = false
            cancelReconnectTaskLocked()
        }
        updateConnectionState(
            phase = "reconnecting",
            statusMessage = "Reconnecting…",
            errorMessage = null,
            authBlocked = false,
        )
        val activeConnection = currentConnection
        if (activeConnection != null) {
            disposeConnection(activeConnection)
            onDisconnected()
        }
        startReconnectLoop()
    }

    fun request(method: String, paramsJson: String?, timeoutMs: Long = DEFAULT_REQUEST_TIMEOUT_MS): String {
        val connection = currentConnection?.takeIf { it.didConnect.get() }
            ?: throw IllegalStateException("not connected")
        val response =
            sendRequestInternal(
                connection = connection,
                method = method,
                params = paramsJson?.trim()?.takeIf { it.isNotEmpty() }?.let(::parseJsonValue),
                timeoutMs = timeoutMs,
            )
        if (!response.ok) {
            val error = response.error
            throw IllegalStateException(
                "${error?.code ?: "UNAVAILABLE"}: ${error?.message ?: "request failed"}",
            )
        }
        return response.payloadJson ?: ""
    }

    fun close() {
        synchronized(reconnectLock) {
            allowReconnect = false
            sessionClosed = true
            reconnectPausedForAuthFailure = false
            cancelReconnectTaskLocked()
        }
        disposeConnection(currentConnection)
        reconnectExecutor.shutdownNow()
        updateConnectionState(
            phase = "disconnected",
            statusMessage = "Offline",
            errorMessage = null,
            authBlocked = false,
        )
        onDisconnected()
    }

    fun getConnectionState(): OpenClawConnectionState {
        return OpenClawConnectionState(
            authBlocked = connectionAuthBlocked,
            errorMessage = connectionErrorMessage,
            phase = connectionPhase,
            statusMessage = connectionStatusMessage,
        )
    }

    private fun connectBlocking(): String? {
        while (true) {
            val connection = openConnection()
            currentConnection = connection
            val deviceIdentity = runCatching { identityStore.loadOrCreate() }.getOrNull()
            val selectedAuth = selectConnectAuth(deviceIdentity?.deviceId)

            try {
                val challengeNonce =
                    try {
                        connection.challengeFuture.get(CONNECT_CHALLENGE_TIMEOUT_MS, TimeUnit.MILLISECONDS)
                    } catch (error: Throwable) {
                        throw IllegalStateException("connect challenge timeout", error)
                    }

                val response =
                    sendRequestInternal(
                        connection = connection,
                        method = "connect",
                        params = buildConnectParams(challengeNonce, selectedAuth, deviceIdentity),
                        timeoutMs = CONNECT_REQUEST_TIMEOUT_MS,
                    )

                if (!response.ok) {
                    val error = response.error ?: GatewayErrorShape("UNAVAILABLE", "connect failed")
                    val shouldRetry =
                        shouldRetryWithStoredDeviceToken(
                            error = error,
                            explicitGatewayToken = config.token?.trim()?.takeIf { it.isNotEmpty() },
                            storedToken =
                                deviceIdentity
                                    ?.let { deviceAuthStore.loadToken(it.deviceId, config.options.role) }
                                    ?.trim()
                                    ?.takeIf { it.isNotEmpty() },
                            attemptedDeviceTokenRetry = selectedAuth.attemptedDeviceTokenRetry,
                        )
                    if (shouldRetry) {
                        pendingDeviceTokenRetry = true
                        deviceTokenRetryBudgetUsed = true
                        disposeConnection(connection)
                        continue
                    }

                    if (selectedAuth.attemptedDeviceTokenRetry && shouldClearStoredDeviceTokenAfterRetry(error)) {
                        val deviceId = deviceIdentity?.deviceId
                        if (!deviceId.isNullOrBlank()) {
                            deviceAuthStore.clearToken(deviceId, config.options.role)
                        }
                    }
                    if (shouldPauseReconnectAfterAuthFailure(error)) {
                        reconnectPausedForAuthFailure = true
                        updateConnectionState(
                            phase = "auth-blocked",
                            statusMessage = error.details?.reason ?: "Reauthentication required",
                            errorMessage = "${error.code}: ${error.message}",
                            authBlocked = true,
                        )
                    } else {
                        updateConnectionState(
                            phase = if (allowReconnect) "reconnecting" else "disconnected",
                            statusMessage = "Connection failed",
                            errorMessage = "${error.code}: ${error.message}",
                            authBlocked = false,
                        )
                    }
                    disposeConnection(connection)
                    throw IllegalStateException("${error.code}: ${error.message}")
                }

                val payload = JSONObject(response.payloadJson ?: "{}")
                persistIssuedAuthTokens(payload, selectedAuth, deviceIdentity?.deviceId)
                pendingDeviceTokenRetry = false
                deviceTokenRetryBudgetUsed = false
                reconnectPausedForAuthFailure = false
                connection.didConnect.set(true)
                updateConnectionState(
                    phase = "connected",
                    statusMessage = "Connected",
                    errorMessage = null,
                    authBlocked = false,
                )
                val sessionDefaults = payload.optJSONObject("snapshot")?.optJSONObject("sessionDefaults")
                val mainSessionKey =
                    sessionDefaults?.optString("mainSessionKey")?.trim()?.takeIf { it.isNotEmpty() }
                onConnected(mainSessionKey)
                return mainSessionKey
            } catch (error: Throwable) {
                disposeConnection(connection)
                currentConnection = null
                if (error is IllegalStateException) {
                    throw error
                }
                throw IllegalStateException(error.message ?: "connect failed", error)
            }
        }
    }

    private fun openConnection(): ActiveConnection {
        val challengeFuture = CompletableFuture<String>()
        val client = buildClient()
        val connectionId = connectionIds.incrementAndGet()
        lateinit var connection: ActiveConnection
        val listener =
            object : WebSocketListener() {
                override fun onMessage(webSocket: WebSocket, text: String) {
                    val frame = runCatching { JSONObject(text) }.getOrNull() ?: return
                    when (frame.optString("type")) {
                        "event" -> handleEvent(connection, frame)
                        "res" -> handleResponse(connection, frame)
                    }
                }

                override fun onFailure(webSocket: WebSocket, t: Throwable, response: Response?) {
                    if (!challengeFuture.isDone) {
                        challengeFuture.completeExceptionally(t)
                    }
                    handleUnexpectedTransportClose(
                        connection = connection,
                        message = "Gateway error: ${t.message ?: t::class.java.simpleName}",
                    )
                }

                override fun onClosed(webSocket: WebSocket, code: Int, reason: String) {
                    if (!challengeFuture.isDone) {
                        challengeFuture.completeExceptionally(
                            IllegalStateException("Gateway closed: $reason"),
                        )
                    }
                    handleUnexpectedTransportClose(
                        connection = connection,
                        message = "Gateway closed: $reason",
                    )
                }
            }
        val socket =
            client.newWebSocket(
                Request
                    .Builder()
                    .url(buildGatewayWebSocketUrl(config.endpoint.host, config.endpoint.port, config.endpoint.tls))
                    .build(),
                listener,
            )
        connection =
            ActiveConnection(
                id = connectionId,
                client = client,
                socket = socket,
                challengeFuture = challengeFuture,
            )
        return connection
    }

    private fun buildClient(): OkHttpClient {
        val tlsConfig =
            buildGatewayTlsConfig(
                if (config.endpoint.tls) {
                    GatewayTlsParams(expectedFingerprint = config.expectedFingerprint)
                } else {
                    null
                },
            )
        val builder =
            OkHttpClient
                .Builder()
                .writeTimeout(60, TimeUnit.SECONDS)
                .readTimeout(0, TimeUnit.SECONDS)
                .pingInterval(30, TimeUnit.SECONDS)
        if (tlsConfig != null) {
            builder.sslSocketFactory(tlsConfig.sslSocketFactory, tlsConfig.trustManager)
            builder.hostnameVerifier(tlsConfig.hostnameVerifier)
        }
        return builder.build()
    }

    private fun sendRequestInternal(
        connection: ActiveConnection,
        method: String,
        params: Any?,
        timeoutMs: Long,
    ): GatewayRpcResponse {
        val id = UUID.randomUUID().toString()
        val future = CompletableFuture<GatewayRpcResponse>()
        connection.pending[id] = future

        val frame =
            JSONObject()
                .put("type", "req")
                .put("id", id)
                .put("method", method)
        if (params != null) {
            frame.put("params", params)
        }
        if (!connection.socket.send(frame.toString())) {
            connection.pending.remove(id)
            throw IllegalStateException("socket send failed")
        }

        return try {
            future.get(timeoutMs, TimeUnit.MILLISECONDS)
        } catch (_: TimeoutException) {
            connection.pending.remove(id)
            throw IllegalStateException("request timeout")
        }
    }

    private fun handleEvent(connection: ActiveConnection, frame: JSONObject) {
        if (frame.optString("event") != "connect.challenge") {
            return
        }
        val payloadJson =
            when {
                frame.has("payloadJSON") && !frame.isNull("payloadJSON") -> frame.optString("payloadJSON")
                frame.has("payload") && !frame.isNull("payload") -> frame.opt("payload")?.toString()
                else -> null
            }
        val payload = payloadJson?.let { runCatching { JSONObject(it) }.getOrNull() } ?: return
        val nonce = payload.optString("nonce").trim()
        if (nonce.isNotEmpty() && !connection.challengeFuture.isDone) {
            connection.challengeFuture.complete(nonce)
        }
    }

    private fun handleResponse(connection: ActiveConnection, frame: JSONObject) {
        val id = frame.optString("id").trim()
        if (id.isEmpty()) return
        val future = connection.pending.remove(id) ?: return
        future.complete(
            GatewayRpcResponse(
                ok = frame.optBoolean("ok", false),
                payloadJson =
                    when {
                        frame.has("payloadJSON") && !frame.isNull("payloadJSON") ->
                            frame.optString("payloadJSON")
                        frame.has("payload") && !frame.isNull("payload") -> frame.opt("payload")?.toString()
                        else -> null
                    },
                error =
                    frame.optJSONObject("error")?.let { errorObject ->
                        GatewayErrorShape(
                            code = errorObject.optString("code").trim().ifEmpty { "UNAVAILABLE" },
                            message = errorObject.optString("message").trim().ifEmpty { "request failed" },
                            details =
                                errorObject.optJSONObject("details")?.let { detailObject ->
                                    GatewayConnectErrorDetails(
                                        code = detailObject.optString("code").trim().ifEmpty { null },
                                        canRetryWithDeviceToken = detailObject.optBoolean("canRetryWithDeviceToken", false),
                                        recommendedNextStep =
                                            detailObject.optString("recommendedNextStep").trim().ifEmpty { null },
                                        reason = detailObject.optString("reason").trim().ifEmpty { null },
                                    )
                                },
                        )
                    },
            ),
        )
    }

    private fun handleUnexpectedTransportClose(connection: ActiveConnection, message: String) {
        if (!connection.didConnect.get()) {
            disposeConnection(connection)
            return
        }
        disposeConnection(connection)
        if (sessionClosed) {
            return
        }
        updateConnectionState(
            phase = if (allowReconnect && !reconnectPausedForAuthFailure) "reconnecting" else "disconnected",
            statusMessage = message,
            errorMessage = message,
            authBlocked = false,
        )
        onDisconnected()
        if (allowReconnect && !reconnectPausedForAuthFailure) {
            startReconnectLoop()
        }
    }

    private fun disposeConnection(connection: ActiveConnection?) {
        if (connection == null || !connection.disposed.compareAndSet(false, true)) {
            return
        }
        if (!connection.challengeFuture.isDone) {
            connection.challengeFuture.completeExceptionally(
                IllegalStateException("gateway connection closed"),
            )
        }
        for ((_, future) in connection.pending) {
            future.completeExceptionally(IllegalStateException("gateway connection closed"))
        }
        connection.pending.clear()
        if (currentConnection?.id == connection.id) {
            currentConnection = null
        }
        runCatching { connection.socket.close(1000, "bye") }
        connection.client.dispatcher.executorService.shutdown()
        connection.client.connectionPool.evictAll()
    }

    private fun startReconnectLoop() {
        synchronized(reconnectLock) {
            if (sessionClosed || !allowReconnect || reconnectPausedForAuthFailure) {
                return
            }
            val existing = reconnectTask
            if (existing != null && !existing.isDone) {
                return
            }
            reconnectTask =
                reconnectExecutor.submit {
                    var attempt = 0
                    while (!sessionClosed && allowReconnect && !reconnectPausedForAuthFailure) {
                        updateConnectionState(
                            phase = "reconnecting",
                            statusMessage = if (attempt == 0) "Reconnecting…" else "Retrying connection…",
                            errorMessage = connectionErrorMessage,
                            authBlocked = false,
                        )
                        try {
                            connectBlocking()
                            return@submit
                        } catch (error: Throwable) {
                            updateConnectionState(
                                phase = if (reconnectPausedForAuthFailure) "auth-blocked" else "reconnecting",
                                statusMessage =
                                    if (reconnectPausedForAuthFailure) {
                                        connectionStatusMessage ?: "Reauthentication required"
                                    } else {
                                        "Retrying connection…"
                                    },
                                errorMessage = error.message,
                                authBlocked = reconnectPausedForAuthFailure,
                            )
                            if (sessionClosed || !allowReconnect || reconnectPausedForAuthFailure) {
                                return@submit
                            }
                            attempt += 1
                            val sleepMs =
                                minOf(8_000L, (350.0 * Math.pow(1.7, attempt.toDouble())).toLong())
                            Thread.sleep(sleepMs)
                        }
                    }
                }
        }
    }

    private fun cancelReconnectTaskLocked() {
        reconnectTask?.cancel(true)
        reconnectTask = null
    }

    private fun selectConnectAuth(deviceId: String?): SelectedConnectAuth {
        val explicitGatewayToken = config.token?.trim()?.takeIf { it.isNotEmpty() }
        val explicitBootstrapToken = config.bootstrapToken?.trim()?.takeIf { it.isNotEmpty() }
        val explicitPassword = config.password?.trim()?.takeIf { it.isNotEmpty() }
        val storedToken =
            deviceId
                ?.let { deviceAuthStore.loadToken(it, config.options.role) }
                ?.trim()
                ?.takeIf { it.isNotEmpty() }
        val shouldUseDeviceRetryToken =
            pendingDeviceTokenRetry &&
                explicitGatewayToken != null &&
                storedToken != null &&
                isTrustedDeviceRetryEndpoint()
        val authToken =
            explicitGatewayToken
                ?: if (
                    explicitPassword == null &&
                        (explicitBootstrapToken == null || storedToken != null)
                ) {
                    storedToken
                } else {
                    null
                }
        val authDeviceToken = if (shouldUseDeviceRetryToken) storedToken else null
        val authBootstrapToken = if (authToken == null) explicitBootstrapToken else null
        val authSource =
            when {
                authDeviceToken != null || (explicitGatewayToken == null && authToken != null) ->
                    GatewayConnectAuthSource.DEVICE_TOKEN
                authToken != null -> GatewayConnectAuthSource.SHARED_TOKEN
                authBootstrapToken != null -> GatewayConnectAuthSource.BOOTSTRAP_TOKEN
                explicitPassword != null -> GatewayConnectAuthSource.PASSWORD
                else -> GatewayConnectAuthSource.NONE
            }
        return SelectedConnectAuth(
            authToken = authToken,
            authBootstrapToken = authBootstrapToken,
            authDeviceToken = authDeviceToken,
            authPassword = explicitPassword,
            signatureToken = authToken ?: authBootstrapToken,
            authSource = authSource,
            attemptedDeviceTokenRetry = shouldUseDeviceRetryToken,
        )
    }

    private fun shouldRetryWithStoredDeviceToken(
        error: GatewayErrorShape,
        explicitGatewayToken: String?,
        storedToken: String?,
        attemptedDeviceTokenRetry: Boolean,
    ): Boolean {
        if (deviceTokenRetryBudgetUsed) return false
        if (attemptedDeviceTokenRetry) return false
        if (explicitGatewayToken == null || storedToken == null) return false
        if (!isTrustedDeviceRetryEndpoint()) return false
        val detailCode = error.details?.code
        val recommendedNextStep = error.details?.recommendedNextStep
        return error.details?.canRetryWithDeviceToken == true ||
            recommendedNextStep == "retry_with_device_token" ||
            detailCode == "AUTH_TOKEN_MISMATCH"
    }

    private fun shouldPauseReconnectAfterAuthFailure(error: GatewayErrorShape): Boolean {
        return when (error.details?.code) {
            "AUTH_TOKEN_MISSING",
            "AUTH_BOOTSTRAP_TOKEN_INVALID",
            "AUTH_PASSWORD_MISSING",
            "AUTH_PASSWORD_MISMATCH",
            "AUTH_RATE_LIMITED",
            "PAIRING_REQUIRED",
            "CONTROL_UI_DEVICE_IDENTITY_REQUIRED",
            "DEVICE_IDENTITY_REQUIRED" -> true
            "AUTH_TOKEN_MISMATCH" -> deviceTokenRetryBudgetUsed && !pendingDeviceTokenRetry
            else -> false
        }
    }

    private fun shouldClearStoredDeviceTokenAfterRetry(error: GatewayErrorShape): Boolean {
        return error.details?.code == "AUTH_DEVICE_TOKEN_MISMATCH"
    }

    private fun isTrustedDeviceRetryEndpoint(): Boolean {
        if (isLoopbackGatewayHost(config.endpoint.host)) {
            return true
        }
        return !config.expectedFingerprint.isNullOrBlank()
    }

    private fun persistIssuedAuthTokens(
        payload: JSONObject,
        auth: SelectedConnectAuth,
        deviceId: String?,
    ) {
        if (deviceId.isNullOrBlank()) {
            return
        }
        val authPayload = payload.optJSONObject("auth") ?: return
        val authRole = authPayload.optString("role").trim().ifEmpty { config.options.role }
        val authScopes =
            authPayload.optJSONArray("scopes")
                ?.let(::readScopes)
                ?: emptyList()
        val authToken = authPayload.optString("deviceToken").trim()

        if (auth.authSource == GatewayConnectAuthSource.BOOTSTRAP_TOKEN) {
            if (!shouldPersistBootstrapHandoffTokens()) {
                return
            }
            persistBootstrapHandoffToken(deviceId, authRole, authToken, authScopes)
        } else {
            persistIssuedDeviceToken(deviceId, authRole, authToken, authScopes)
        }

        if (
            auth.authSource != GatewayConnectAuthSource.BOOTSTRAP_TOKEN ||
                !shouldPersistBootstrapHandoffTokens()
        ) {
            return
        }
        val extraTokens = authPayload.optJSONArray("deviceTokens") ?: return
        for (index in 0 until extraTokens.length()) {
            val entry = extraTokens.optJSONObject(index) ?: continue
            persistBootstrapHandoffToken(
                deviceId = deviceId,
                role = entry.optString("role").trim(),
                token = entry.optString("deviceToken").trim(),
                scopes =
                    entry.optJSONArray("scopes")
                        ?.let(::readScopes)
                        ?: emptyList(),
            )
        }
    }

    private fun persistIssuedDeviceToken(
        deviceId: String,
        role: String,
        token: String,
        scopes: List<String>,
    ) {
        if (deviceId.isBlank() || role.isBlank() || token.isBlank()) {
            return
        }
        deviceAuthStore.saveToken(deviceId, role, token, scopes)
    }

    private fun persistBootstrapHandoffToken(
        deviceId: String,
        role: String,
        token: String,
        scopes: List<String>,
    ) {
        val filteredScopes = filteredBootstrapHandoffScopes(role, scopes) ?: return
        persistIssuedDeviceToken(deviceId, role.trim().lowercase(Locale.US), token, filteredScopes)
    }

    private fun filteredBootstrapHandoffScopes(role: String, scopes: List<String>): List<String>? {
        return when (role.trim().lowercase(Locale.US)) {
            "node" -> emptyList()
            "operator" -> {
                val allowedOperatorScopes =
                    setOf(
                        "operator.approvals",
                        "operator.read",
                        "operator.talk.secrets",
                        "operator.write",
                    )
                scopes.filter { allowedOperatorScopes.contains(it) }.distinct().sorted()
            }
            else -> null
        }
    }

    private fun shouldPersistBootstrapHandoffTokens(): Boolean {
        if (isLoopbackGatewayHost(config.endpoint.host)) {
            return true
        }
        return !config.expectedFingerprint.isNullOrBlank()
    }

    private fun buildConnectParams(
        challengeNonce: String,
        auth: SelectedConnectAuth,
        deviceIdentity: DeviceIdentity?,
    ): JSONObject {
        val options = config.options
        val clientInfo = options.client
        val params =
            JSONObject()
                .put("minProtocol", GATEWAY_PROTOCOL_VERSION)
                .put("maxProtocol", GATEWAY_PROTOCOL_VERSION)
                .put(
                    "client",
                    JSONObject()
                        .put("id", clientInfo.id)
                        .putOpt("displayName", clientInfo.displayName)
                        .put("version", clientInfo.version)
                        .put("platform", clientInfo.platform)
                        .put("mode", clientInfo.mode)
                        .putOpt("instanceId", clientInfo.instanceId)
                        .putOpt("deviceFamily", clientInfo.deviceFamily)
                        .putOpt("modelIdentifier", clientInfo.modelIdentifier),
                )
                .put("role", options.role)
                .put("locale", options.locale ?: Locale.getDefault().toLanguageTag())

        if (options.caps.isNotEmpty()) {
            params.put("caps", JSONArray(options.caps))
        }
        if (options.commands.isNotEmpty()) {
            params.put("commands", JSONArray(options.commands))
        }
        if (options.permissions.isNotEmpty()) {
            val permissionsJson = JSONObject()
            for ((key, value) in options.permissions) {
                permissionsJson.put(key, value)
            }
            params.put("permissions", permissionsJson)
        }
        if (options.scopes.isNotEmpty()) {
            params.put("scopes", JSONArray(options.scopes))
        }
        options.userAgent?.trim()?.takeIf { it.isNotEmpty() }?.let { params.put("userAgent", it) }

        when {
            auth.authToken != null -> {
                val authJson = JSONObject().put("token", auth.authToken)
                auth.authDeviceToken?.let { authJson.put("deviceToken", it) }
                params.put("auth", authJson)
            }
            auth.authBootstrapToken != null -> {
                params.put("auth", JSONObject().put("bootstrapToken", auth.authBootstrapToken))
            }
            auth.authPassword != null -> {
                params.put("auth", JSONObject().put("password", auth.authPassword))
            }
        }

        if (deviceIdentity != null) {
            val signedAtMs = System.currentTimeMillis()
            val signaturePayload =
                DeviceAuthPayload.buildV3(
                    deviceId = deviceIdentity.deviceId,
                    clientId = clientInfo.id,
                    clientMode = clientInfo.mode,
                    role = options.role,
                    scopes = options.scopes,
                    signedAtMs = signedAtMs,
                    token = auth.signatureToken,
                    nonce = challengeNonce,
                    platform = clientInfo.platform,
                    deviceFamily = clientInfo.deviceFamily,
                )
            val publicKey = identityStore.publicKeyBase64Url(deviceIdentity)
            val signature = identityStore.signPayload(signaturePayload, deviceIdentity)
            if (!publicKey.isNullOrBlank() && !signature.isNullOrBlank()) {
                params.put(
                    "device",
                    JSONObject()
                        .put("id", deviceIdentity.deviceId)
                        .put("publicKey", publicKey)
                        .put("signature", signature)
                        .put("signedAt", signedAtMs)
                        .put("nonce", challengeNonce),
                )
            }
        }

        return params
    }

    private fun parseJsonValue(raw: String): Any {
        val value = JSONTokener(raw).nextValue()
        return when (value) {
            is JSONObject,
            is JSONArray,
            is String,
            is Number,
            is Boolean -> value
            JSONObject.NULL -> JSONObject.NULL
            else -> throw IllegalArgumentException("unsupported JSON payload")
        }
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

    private fun updateConnectionState(
        phase: String,
        statusMessage: String?,
        errorMessage: String?,
        authBlocked: Boolean,
    ) {
        connectionPhase = phase
        connectionStatusMessage = statusMessage
        connectionErrorMessage = errorMessage
        connectionAuthBlocked = authBlocked
    }
}

internal fun buildGatewayWebSocketUrl(host: String, port: Int, useTls: Boolean): String {
    val scheme = if (useTls) "wss" else "ws"
    return "$scheme://${formatGatewayAuthority(host, port)}"
}

internal fun formatGatewayAuthority(host: String, port: Int): String {
    return "${formatGatewayAuthorityHost(host)}:$port"
}

private fun formatGatewayAuthorityHost(host: String): String {
    val normalizedHost = host.trim().trim('[', ']')
    return if (normalizedHost.contains(":")) "[$normalizedHost]" else normalizedHost
}

internal fun buildLauncherGatewayClientInfo(context: Context): GatewayClientInfo {
    val versionName =
        runCatching {
            val packageInfo =
                context.packageManager.getPackageInfo(context.packageName, 0)
            packageInfo.versionName?.trim().orEmpty()
        }.getOrDefault("")
    return GatewayClientInfo(
        id = "openclaw-android",
        displayName = null,
        version = versionName.ifEmpty { "0.0.0" },
        platform = "android",
        mode = "ui",
        instanceId = null,
        deviceFamily = "Android",
        modelIdentifier = Build.MODEL?.trim()?.takeIf { it.isNotEmpty() },
    )
}

internal fun buildLauncherGatewayUserAgent(context: Context): String {
    val versionName =
        runCatching {
            val packageInfo =
                context.packageManager.getPackageInfo(context.packageName, 0)
            packageInfo.versionName?.trim().orEmpty()
        }.getOrDefault("")
    val release = Build.VERSION.RELEASE?.trim().orEmpty().ifEmpty { "unknown" }
    return "OpenClawAndroid/${versionName.ifEmpty { "0.0.0" }} (Android $release; SDK ${Build.VERSION.SDK_INT})"
}
