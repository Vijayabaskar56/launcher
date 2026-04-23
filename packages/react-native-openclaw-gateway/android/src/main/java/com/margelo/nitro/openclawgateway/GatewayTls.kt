package com.margelo.nitro.openclawgateway

import android.annotation.SuppressLint
import java.io.EOFException
import java.net.ConnectException
import java.net.InetSocketAddress
import java.net.SocketTimeoutException
import java.net.UnknownHostException
import java.security.MessageDigest
import java.security.SecureRandom
import java.security.cert.CertificateException
import java.security.cert.X509Certificate
import java.util.Locale
import javax.net.ssl.HttpsURLConnection
import javax.net.ssl.HostnameVerifier
import javax.net.ssl.SSLContext
import javax.net.ssl.SSLException
import javax.net.ssl.SSLParameters
import javax.net.ssl.SSLSocket
import javax.net.ssl.SSLSocketFactory
import javax.net.ssl.SNIHostName
import javax.net.ssl.TrustManagerFactory
import javax.net.ssl.X509TrustManager

internal data class GatewayTlsParams(
    val expectedFingerprint: String?,
)

internal data class GatewayTlsConfig(
    val sslSocketFactory: SSLSocketFactory,
    val trustManager: X509TrustManager,
    val hostnameVerifier: HostnameVerifier,
)

internal fun buildGatewayTlsConfig(params: GatewayTlsParams?): GatewayTlsConfig? {
    if (params == null) return null
    val expected = params.expectedFingerprint?.let(::normalizeFingerprint)
    val defaultTrustManager = defaultTrustManager()
    @SuppressLint("CustomX509TrustManager")
    val trustManager =
        object : X509TrustManager {
            override fun checkClientTrusted(chain: Array<X509Certificate>, authType: String) {
                defaultTrustManager.checkClientTrusted(chain, authType)
            }

            override fun checkServerTrusted(chain: Array<X509Certificate>, authType: String) {
                if (chain.isEmpty()) {
                    throw CertificateException("empty certificate chain")
                }
                if (expected == null) {
                    defaultTrustManager.checkServerTrusted(chain, authType)
                    return
                }
                val fingerprint = sha256Hex(chain[0].encoded)
                if (fingerprint != expected) {
                    throw CertificateException("gateway TLS fingerprint mismatch")
                }
            }

            override fun getAcceptedIssuers(): Array<X509Certificate> = defaultTrustManager.acceptedIssuers
        }

    val context = SSLContext.getInstance("TLS")
    context.init(null, arrayOf(trustManager), SecureRandom())
    val hostnameVerifier =
        if (expected != null) {
            HostnameVerifier { _, _ -> true }
        } else {
            HttpsURLConnection.getDefaultHostnameVerifier()
        }
    return GatewayTlsConfig(
        sslSocketFactory = context.socketFactory,
        trustManager = trustManager,
        hostnameVerifier = hostnameVerifier,
    )
}

internal fun probeGatewayTlsFingerprint(
    host: String,
    port: Int,
    timeoutMs: Int = 3_000,
): OpenClawTlsProbeResult {
    val trimmedHost = host.trim()
    if (trimmedHost.isEmpty() || port !in 1..65_535) {
        return OpenClawTlsProbeResult(
            fingerprintSha256 = null,
            failureCode = "ENDPOINT_UNREACHABLE",
        )
    }

    val trustAllManager =
        @SuppressLint("CustomX509TrustManager", "TrustAllX509TrustManager")
        object : X509TrustManager {
            @SuppressLint("TrustAllX509TrustManager")
            override fun checkClientTrusted(chain: Array<X509Certificate>, authType: String) {}

            @SuppressLint("TrustAllX509TrustManager")
            override fun checkServerTrusted(chain: Array<X509Certificate>, authType: String) {}

            override fun getAcceptedIssuers(): Array<X509Certificate> = emptyArray()
        }

    val context = SSLContext.getInstance("TLS")
    context.init(null, arrayOf(trustAllManager), SecureRandom())
    val socket = context.socketFactory.createSocket() as SSLSocket
    try {
        socket.soTimeout = timeoutMs
        socket.connect(InetSocketAddress(trimmedHost, port), timeoutMs)
        try {
            if (trimmedHost.any { it.isLetter() }) {
                val params = SSLParameters()
                params.serverNames = listOf(SNIHostName(trimmedHost))
                socket.sslParameters = params
            }
        } catch (_: Throwable) {
        }

        socket.startHandshake()
        val certificate =
            socket.session.peerCertificates.firstOrNull() as? X509Certificate
                ?: return OpenClawTlsProbeResult(
                    fingerprintSha256 = null,
                    failureCode = "TLS_UNAVAILABLE",
                )
        return OpenClawTlsProbeResult(
            fingerprintSha256 = sha256Hex(certificate.encoded),
            failureCode = null,
        )
    } catch (error: Throwable) {
        val failureCode =
            when (error) {
                is SSLException,
                is EOFException -> "TLS_UNAVAILABLE"
                is ConnectException,
                is SocketTimeoutException,
                is UnknownHostException -> "ENDPOINT_UNREACHABLE"
                else -> "ENDPOINT_UNREACHABLE"
            }
        return OpenClawTlsProbeResult(fingerprintSha256 = null, failureCode = failureCode)
    } finally {
        runCatching { socket.close() }
    }
}

private fun defaultTrustManager(): X509TrustManager {
    val factory = TrustManagerFactory.getInstance(TrustManagerFactory.getDefaultAlgorithm())
    factory.init(null as java.security.KeyStore?)
    return factory.trustManagers.firstOrNull { it is X509TrustManager } as? X509TrustManager
        ?: throw IllegalStateException("No default X509TrustManager found")
}

private fun sha256Hex(data: ByteArray): String {
    val digest = MessageDigest.getInstance("SHA-256").digest(data)
    val out = StringBuilder(digest.size * 2)
    for (byte in digest) {
        out.append(String.format(Locale.US, "%02x", byte))
    }
    return out.toString()
}

private fun normalizeFingerprint(raw: String): String {
    val stripped =
        raw
            .trim()
            .replace(Regex("^sha-?256\\s*:?\\s*", RegexOption.IGNORE_CASE), "")
    return stripped.lowercase(Locale.US).filter { it in '0'..'9' || it in 'a'..'f' }
}
