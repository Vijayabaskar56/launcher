package com.margelo.nitro.openclawgateway

import android.content.Context
import android.util.Base64
import java.io.File
import java.security.MessageDigest
import org.json.JSONObject

internal data class DeviceIdentity(
    val deviceId: String,
    val publicKeyRawBase64: String,
    val privateKeyPkcs8Base64: String,
    val createdAtMs: Long,
)

internal class DeviceIdentityStore(context: Context) {
    private val identityFile = File(context.filesDir, "openclaw-gateway/device-identity.json")

    @Volatile
    private var cachedIdentity: DeviceIdentity? = null

    @Synchronized
    fun loadOrCreate(): DeviceIdentity {
        cachedIdentity?.let { return it }
        val existing = load()
        if (existing != null) {
            val derivedDeviceId = deriveDeviceId(existing.publicKeyRawBase64)
            if (derivedDeviceId != null && derivedDeviceId != existing.deviceId) {
                val updated = existing.copy(deviceId = derivedDeviceId)
                save(updated)
                cachedIdentity = updated
                return updated
            }
            cachedIdentity = existing
            return existing
        }

        val created = generate()
        save(created)
        cachedIdentity = created
        return created
    }

    fun signPayload(payload: String, identity: DeviceIdentity): String? {
        return try {
            val privateKeyBytes = Base64.decode(identity.privateKeyPkcs8Base64, Base64.DEFAULT)
            val pkInfo = org.bouncycastle.asn1.pkcs.PrivateKeyInfo.getInstance(privateKeyBytes)
            val parsed = pkInfo.parsePrivateKey()
            val rawPrivate = org.bouncycastle.asn1.DEROctetString.getInstance(parsed).octets
            val privateKey =
                org.bouncycastle.crypto.params.Ed25519PrivateKeyParameters(rawPrivate, 0)
            val signer = org.bouncycastle.crypto.signers.Ed25519Signer()
            signer.init(true, privateKey)
            val payloadBytes = payload.toByteArray(Charsets.UTF_8)
            signer.update(payloadBytes, 0, payloadBytes.size)
            base64UrlEncode(signer.generateSignature())
        } catch (_: Throwable) {
            null
        }
    }

    fun publicKeyBase64Url(identity: DeviceIdentity): String? {
        return try {
            val raw = Base64.decode(identity.publicKeyRawBase64, Base64.DEFAULT)
            base64UrlEncode(raw)
        } catch (_: Throwable) {
            null
        }
    }

    private fun load(): DeviceIdentity? {
        return try {
            if (!identityFile.exists()) return null
            val raw = identityFile.readText(Charsets.UTF_8)
            val json = JSONObject(raw)
            val identity =
                DeviceIdentity(
                    deviceId = json.optString("deviceId").trim(),
                    publicKeyRawBase64 = json.optString("publicKeyRawBase64").trim(),
                    privateKeyPkcs8Base64 = json.optString("privateKeyPkcs8Base64").trim(),
                    createdAtMs = json.optLong("createdAtMs"),
                )
            if (
                identity.deviceId.isBlank() ||
                    identity.publicKeyRawBase64.isBlank() ||
                    identity.privateKeyPkcs8Base64.isBlank()
            ) {
                null
            } else {
                identity
            }
        } catch (_: Throwable) {
            null
        }
    }

    private fun save(identity: DeviceIdentity) {
        runCatching {
            identityFile.parentFile?.mkdirs()
            val json =
                JSONObject()
                    .put("deviceId", identity.deviceId)
                    .put("publicKeyRawBase64", identity.publicKeyRawBase64)
                    .put("privateKeyPkcs8Base64", identity.privateKeyPkcs8Base64)
                    .put("createdAtMs", identity.createdAtMs)
            identityFile.writeText(json.toString(), Charsets.UTF_8)
        }
    }

    private fun generate(): DeviceIdentity {
        val keyPairGenerator = org.bouncycastle.crypto.generators.Ed25519KeyPairGenerator()
        keyPairGenerator.init(
            org.bouncycastle.crypto.params.Ed25519KeyGenerationParameters(
                java.security.SecureRandom(),
            ),
        )
        val keyPair = keyPairGenerator.generateKeyPair()
        val publicKey = keyPair.public as org.bouncycastle.crypto.params.Ed25519PublicKeyParameters
        val privateKey =
            keyPair.private as org.bouncycastle.crypto.params.Ed25519PrivateKeyParameters
        val rawPublic = publicKey.encoded
        val deviceId = sha256Hex(rawPublic)
        val privateKeyInfo =
            org.bouncycastle.crypto.util.PrivateKeyInfoFactory.createPrivateKeyInfo(privateKey)

        return DeviceIdentity(
            deviceId = deviceId,
            publicKeyRawBase64 = Base64.encodeToString(rawPublic, Base64.NO_WRAP),
            privateKeyPkcs8Base64 =
                Base64.encodeToString(privateKeyInfo.encoded, Base64.NO_WRAP),
            createdAtMs = System.currentTimeMillis(),
        )
    }

    private fun deriveDeviceId(publicKeyRawBase64: String): String? {
        return try {
            val raw = Base64.decode(publicKeyRawBase64, Base64.DEFAULT)
            sha256Hex(raw)
        } catch (_: Throwable) {
            null
        }
    }

    private fun sha256Hex(data: ByteArray): String {
        val digest = MessageDigest.getInstance("SHA-256").digest(data)
        val out = CharArray(digest.size * 2)
        var index = 0
        for (byte in digest) {
            val value = byte.toInt() and 0xff
            out[index++] = HEX[value ushr 4]
            out[index++] = HEX[value and 0x0f]
        }
        return String(out)
    }

    private fun base64UrlEncode(data: ByteArray): String =
        Base64.encodeToString(data, Base64.URL_SAFE or Base64.NO_WRAP or Base64.NO_PADDING)

    private companion object {
        private val HEX = "0123456789abcdef".toCharArray()
    }
}
