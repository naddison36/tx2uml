import {
    accessListify,
    AccessListish,
    UnsignedTransaction,
} from "@ethersproject/transactions"
import {
    arrayify,
    DataOptions,
    hexConcat,
    hexlify,
    isBytesLike,
    SignatureLike,
    splitSignature,
    stripZeros,
} from "@ethersproject/bytes"
import { checkProperties } from "@ethersproject/properties"
import * as RLP from "@ethersproject/rlp"
import { getAddress } from "@ethersproject/address"
import { BigNumber, BigNumberish } from "@ethersproject/bignumber"
import { logger } from "ethers"
import { Logger } from "@ethersproject/logger"

// The following functions have been copied from Ethers v5
// https://github.com/ethers-io/ethers.js/blob/v5/packages/transactions/src.ts/index.ts
// Ethers is strict on EIP-1559 fees ensuring the gasPrice matches the maxFeePerGas
// so a modified version of Ethers' serialize is used without this check.

export function serialize(
    transaction: UnsignedTransaction,
    signature?: SignatureLike
): string {
    // Legacy and EIP-155 Transactions
    if (transaction.type == null || transaction.type === 0) {
        return _serialize(transaction, signature)
    }

    // Typed Transactions (EIP-2718)
    switch (transaction.type) {
        case 1:
            return _serializeEip2930(transaction, signature)
        case 2:
            return _serializeEip1559(transaction, signature)
        default:
            break
    }

    return logger.throwError(
        `unsupported transaction type: ${transaction.type}`,
        Logger.errors.UNSUPPORTED_OPERATION,
        {
            operation: "serializeTransaction",
            transactionType: transaction.type,
        }
    )
}

// Legacy Transaction Fields
const transactionFields = [
    { name: "nonce", maxLength: 32, numeric: true },
    { name: "gasPrice", maxLength: 32, numeric: true },
    { name: "gasLimit", maxLength: 32, numeric: true },
    { name: "to", length: 20 },
    { name: "value", maxLength: 32, numeric: true },
    { name: "data" },
]

const allowedTransactionKeys: { [key: string]: boolean } = {
    chainId: true,
    data: true,
    gasLimit: true,
    gasPrice: true,
    nonce: true,
    to: true,
    type: true,
    value: true,
}

// Legacy Transactions and EIP-155
function _serialize(
    transaction: UnsignedTransaction,
    signature?: SignatureLike
): string {
    checkProperties(transaction, allowedTransactionKeys)

    const raw: Array<string | Uint8Array> = []

    transactionFields.forEach(function (fieldInfo) {
        let value = (<any>transaction)[fieldInfo.name] || []
        const options: DataOptions = {}
        if (fieldInfo.numeric) {
            options.hexPad = "left"
        }
        value = arrayify(hexlify(value, options))

        // Fixed-width field
        if (
            fieldInfo.length &&
            value.length !== fieldInfo.length &&
            value.length > 0
        ) {
            logger.throwArgumentError(
                "invalid length for " + fieldInfo.name,
                "transaction:" + fieldInfo.name,
                value
            )
        }

        // Variable-width (with a maximum)
        if (fieldInfo.maxLength) {
            value = stripZeros(value)
            if (value.length > fieldInfo.maxLength) {
                logger.throwArgumentError(
                    "invalid length for " + fieldInfo.name,
                    "transaction:" + fieldInfo.name,
                    value
                )
            }
        }

        raw.push(hexlify(value))
    })

    let chainId = 0
    if (transaction.chainId != null) {
        // A chainId was provided; if non-zero we'll use EIP-155
        chainId = transaction.chainId

        if (typeof chainId !== "number") {
            logger.throwArgumentError(
                "invalid transaction.chainId",
                "transaction",
                transaction
            )
        }
    } else if (signature && !isBytesLike(signature) && signature.v > 28) {
        // No chainId provided, but the signature is signing with EIP-155; derive chainId
        chainId = Math.floor((signature.v - 35) / 2)
    }

    // We have an EIP-155 transaction (chainId was specified and non-zero)
    if (chainId !== 0) {
        raw.push(hexlify(chainId)) // @TODO: hexValue?
        raw.push("0x")
        raw.push("0x")
    }

    // Requesting an unsigned transaction
    if (!signature) {
        return RLP.encode(raw)
    }

    // The splitSignature will ensure the transaction has a recoveryParam in the
    // case that the signTransaction function only adds a v.
    const sig = splitSignature(signature)

    // We pushed a chainId and null r, s on for hashing only; remove those
    let v = 27 + sig.recoveryParam
    if (chainId !== 0) {
        raw.pop()
        raw.pop()
        raw.pop()
        v += chainId * 2 + 8

        // If an EIP-155 v (directly or indirectly; maybe _vs) was provided, check it!
        if (sig.v > 28 && sig.v !== v) {
            logger.throwArgumentError(
                "transaction.chainId/signature.v mismatch",
                "signature",
                signature
            )
        }
    } else if (sig.v !== v) {
        logger.throwArgumentError(
            "transaction.chainId/signature.v mismatch",
            "signature",
            signature
        )
    }

    raw.push(hexlify(v))
    raw.push(stripZeros(arrayify(sig.r)))
    raw.push(stripZeros(arrayify(sig.s)))

    return RLP.encode(raw)
}

function _serializeEip2930(
    transaction: UnsignedTransaction,
    signature?: SignatureLike
): string {
    const fields: any = [
        formatNumber(transaction.chainId || 0, "chainId"),
        formatNumber(transaction.nonce || 0, "nonce"),
        formatNumber(transaction.gasPrice || 0, "gasPrice"),
        formatNumber(transaction.gasLimit || 0, "gasLimit"),
        transaction.to != null ? getAddress(transaction.to) : "0x",
        formatNumber(transaction.value || 0, "value"),
        transaction.data || "0x",
        formatAccessList(transaction.accessList || []),
    ]

    if (signature) {
        const sig = splitSignature(signature)
        fields.push(formatNumber(sig.recoveryParam, "recoveryParam"))
        fields.push(stripZeros(sig.r))
        fields.push(stripZeros(sig.s))
    }

    return hexConcat(["0x01", RLP.encode(fields)])
}

function _serializeEip1559(
    transaction: UnsignedTransaction,
    signature?: SignatureLike
): string {
    // REMOVED this check so executed transactions can be copied
    // If there is an explicit gasPrice, make sure it matches the
    // EIP-1559 fees; otherwise they may not understand what they
    // think they are setting in terms of fee.
    // if (transaction.gasPrice != null) {
    //     const gasPrice = BigNumber.from(transaction.gasPrice)
    //     const maxFeePerGas = BigNumber.from(transaction.maxFeePerGas || 0)
    //     if (!gasPrice.eq(maxFeePerGas)) {
    //         logger.throwArgumentError(
    //             "mismatch EIP-1559 gasPrice != maxFeePerGas",
    //             "tx",
    //             {
    //                 gasPrice,
    //                 maxFeePerGas,
    //             }
    //         )
    //     }
    // }
    const fields: any = [
        formatNumber(transaction.chainId || 0, "chainId"),
        formatNumber(transaction.nonce || 0, "nonce"),
        formatNumber(
            transaction.maxPriorityFeePerGas || 0,
            "maxPriorityFeePerGas"
        ),
        formatNumber(transaction.maxFeePerGas || 0, "maxFeePerGas"),
        formatNumber(transaction.gasLimit || 0, "gasLimit"),
        transaction.to != null ? getAddress(transaction.to) : "0x",
        formatNumber(transaction.value || 0, "value"),
        transaction.data || "0x",
        formatAccessList(transaction.accessList || []),
    ]

    if (signature) {
        const sig = splitSignature(signature)
        fields.push(formatNumber(sig.recoveryParam, "recoveryParam"))
        fields.push(stripZeros(sig.r))
        fields.push(stripZeros(sig.s))
    }

    return hexConcat(["0x02", RLP.encode(fields)])
}

function formatNumber(value: BigNumberish, name: string): Uint8Array {
    const result = stripZeros(BigNumber.from(value).toHexString())
    if (result.length > 32) {
        logger.throwArgumentError(
            "invalid length for " + name,
            "transaction:" + name,
            value
        )
    }
    return result
}

function formatAccessList(
    value: AccessListish
): Array<[string, Array<string>]> {
    return accessListify(value).map(set => [set.address, set.storageKeys])
}
