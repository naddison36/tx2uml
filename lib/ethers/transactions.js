"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.serialize = void 0;
const transactions_1 = require("@ethersproject/transactions");
const bytes_1 = require("@ethersproject/bytes");
const properties_1 = require("@ethersproject/properties");
const RLP = __importStar(require("@ethersproject/rlp"));
const address_1 = require("@ethersproject/address");
const bignumber_1 = require("@ethersproject/bignumber");
const ethers_1 = require("ethers");
const logger_1 = require("@ethersproject/logger");
// The following functions have been copied from Ethers v5
// https://github.com/ethers-io/ethers.js/blob/v5/packages/transactions/src.ts/index.ts
// Ethers is strict on EIP-1559 fees ensuring the gasPrice matches the maxFeePerGas
// so a modified version of Ethers' serialize is used without this check.
function serialize(transaction, signature) {
    // Legacy and EIP-155 Transactions
    if (transaction.type == null || transaction.type === 0) {
        return _serialize(transaction, signature);
    }
    // Typed Transactions (EIP-2718)
    switch (transaction.type) {
        case 1:
            return _serializeEip2930(transaction, signature);
        case 2:
            return _serializeEip1559(transaction, signature);
        default:
            break;
    }
    return ethers_1.logger.throwError(`unsupported transaction type: ${transaction.type}`, logger_1.Logger.errors.UNSUPPORTED_OPERATION, {
        operation: "serializeTransaction",
        transactionType: transaction.type,
    });
}
exports.serialize = serialize;
// Legacy Transaction Fields
const transactionFields = [
    { name: "nonce", maxLength: 32, numeric: true },
    { name: "gasPrice", maxLength: 32, numeric: true },
    { name: "gasLimit", maxLength: 32, numeric: true },
    { name: "to", length: 20 },
    { name: "value", maxLength: 32, numeric: true },
    { name: "data" },
];
const allowedTransactionKeys = {
    chainId: true,
    data: true,
    gasLimit: true,
    gasPrice: true,
    nonce: true,
    to: true,
    type: true,
    value: true,
};
// Legacy Transactions and EIP-155
function _serialize(transaction, signature) {
    (0, properties_1.checkProperties)(transaction, allowedTransactionKeys);
    const raw = [];
    transactionFields.forEach(function (fieldInfo) {
        let value = transaction[fieldInfo.name] || [];
        const options = {};
        if (fieldInfo.numeric) {
            options.hexPad = "left";
        }
        value = (0, bytes_1.arrayify)((0, bytes_1.hexlify)(value, options));
        // Fixed-width field
        if (fieldInfo.length &&
            value.length !== fieldInfo.length &&
            value.length > 0) {
            ethers_1.logger.throwArgumentError("invalid length for " + fieldInfo.name, "transaction:" + fieldInfo.name, value);
        }
        // Variable-width (with a maximum)
        if (fieldInfo.maxLength) {
            value = (0, bytes_1.stripZeros)(value);
            if (value.length > fieldInfo.maxLength) {
                ethers_1.logger.throwArgumentError("invalid length for " + fieldInfo.name, "transaction:" + fieldInfo.name, value);
            }
        }
        raw.push((0, bytes_1.hexlify)(value));
    });
    let chainId = 0;
    if (transaction.chainId != null) {
        // A chainId was provided; if non-zero we'll use EIP-155
        chainId = transaction.chainId;
        if (typeof chainId !== "number") {
            ethers_1.logger.throwArgumentError("invalid transaction.chainId", "transaction", transaction);
        }
    }
    else if (signature && !(0, bytes_1.isBytesLike)(signature) && signature.v > 28) {
        // No chainId provided, but the signature is signing with EIP-155; derive chainId
        chainId = Math.floor((signature.v - 35) / 2);
    }
    // We have an EIP-155 transaction (chainId was specified and non-zero)
    if (chainId !== 0) {
        raw.push((0, bytes_1.hexlify)(chainId)); // @TODO: hexValue?
        raw.push("0x");
        raw.push("0x");
    }
    // Requesting an unsigned transaction
    if (!signature) {
        return RLP.encode(raw);
    }
    // The splitSignature will ensure the transaction has a recoveryParam in the
    // case that the signTransaction function only adds a v.
    const sig = (0, bytes_1.splitSignature)(signature);
    // We pushed a chainId and null r, s on for hashing only; remove those
    let v = 27 + sig.recoveryParam;
    if (chainId !== 0) {
        raw.pop();
        raw.pop();
        raw.pop();
        v += chainId * 2 + 8;
        // If an EIP-155 v (directly or indirectly; maybe _vs) was provided, check it!
        if (sig.v > 28 && sig.v !== v) {
            ethers_1.logger.throwArgumentError("transaction.chainId/signature.v mismatch", "signature", signature);
        }
    }
    else if (sig.v !== v) {
        ethers_1.logger.throwArgumentError("transaction.chainId/signature.v mismatch", "signature", signature);
    }
    raw.push((0, bytes_1.hexlify)(v));
    raw.push((0, bytes_1.stripZeros)((0, bytes_1.arrayify)(sig.r)));
    raw.push((0, bytes_1.stripZeros)((0, bytes_1.arrayify)(sig.s)));
    return RLP.encode(raw);
}
function _serializeEip2930(transaction, signature) {
    const fields = [
        formatNumber(transaction.chainId || 0, "chainId"),
        formatNumber(transaction.nonce || 0, "nonce"),
        formatNumber(transaction.gasPrice || 0, "gasPrice"),
        formatNumber(transaction.gasLimit || 0, "gasLimit"),
        transaction.to != null ? (0, address_1.getAddress)(transaction.to) : "0x",
        formatNumber(transaction.value || 0, "value"),
        transaction.data || "0x",
        formatAccessList(transaction.accessList || []),
    ];
    if (signature) {
        const sig = (0, bytes_1.splitSignature)(signature);
        fields.push(formatNumber(sig.recoveryParam, "recoveryParam"));
        fields.push((0, bytes_1.stripZeros)(sig.r));
        fields.push((0, bytes_1.stripZeros)(sig.s));
    }
    return (0, bytes_1.hexConcat)(["0x01", RLP.encode(fields)]);
}
function _serializeEip1559(transaction, signature) {
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
    const fields = [
        formatNumber(transaction.chainId || 0, "chainId"),
        formatNumber(transaction.nonce || 0, "nonce"),
        formatNumber(transaction.maxPriorityFeePerGas || 0, "maxPriorityFeePerGas"),
        formatNumber(transaction.maxFeePerGas || 0, "maxFeePerGas"),
        formatNumber(transaction.gasLimit || 0, "gasLimit"),
        transaction.to != null ? (0, address_1.getAddress)(transaction.to) : "0x",
        formatNumber(transaction.value || 0, "value"),
        transaction.data || "0x",
        formatAccessList(transaction.accessList || []),
    ];
    if (signature) {
        const sig = (0, bytes_1.splitSignature)(signature);
        fields.push(formatNumber(sig.recoveryParam, "recoveryParam"));
        fields.push((0, bytes_1.stripZeros)(sig.r));
        fields.push((0, bytes_1.stripZeros)(sig.s));
    }
    return (0, bytes_1.hexConcat)(["0x02", RLP.encode(fields)]);
}
function formatNumber(value, name) {
    const result = (0, bytes_1.stripZeros)(bignumber_1.BigNumber.from(value).toHexString());
    if (result.length > 32) {
        ethers_1.logger.throwArgumentError("invalid length for " + name, "transaction:" + name, value);
    }
    return result;
}
function formatAccessList(value) {
    return (0, transactions_1.accessListify)(value).map(set => [set.address, set.storageKeys]);
}
//# sourceMappingURL=transactions.js.map