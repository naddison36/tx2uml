"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseReasonCode = exports.getTransactionError = void 0;
const utils_1 = require("ethers/lib/utils");
const getTransactionError = async (tx, receipt, provider) => {
    if (typeof tx !== "object") {
        throw TypeError(`tx argument ${tx} must be a transaction object`);
    }
    if (typeof receipt !== "object") {
        throw TypeError(`receipt argument ${receipt} must be a transaction receipt object`);
    }
    if (receipt.status) {
        throw TypeError("Transaction did not fail. Can only read the revert reason from failed transactions");
    }
    if (!receipt.transactionHash) {
        throw TypeError(`There is no transaction hash on the receipt object`);
    }
    if (receipt.gasUsed === tx.gasLimit) {
        throw Error("Transaction failed as it ran out of gas.");
    }
    let rawMessageData;
    try {
        const result = await provider.call({
            ...tx,
        }, receipt.blockNumber);
        // Trim the 0x prefix
        rawMessageData = result.slice(2);
    }
    catch (e) {
        if (e.message.startsWith("Node error: ")) {
            // Trim "Node error: "
            const errorObjectStr = e.message.slice(12);
            // Parse the error object
            const errorObject = JSON.parse(errorObjectStr);
            if (!errorObject.data) {
                throw Error("Failed to parse data field error object:" + errorObjectStr);
            }
            if (errorObject.data.startsWith("Reverted 0x")) {
                // Trim "Reverted 0x" from the data field
                rawMessageData = errorObject.data.slice(11);
            }
            else if (errorObject.data.startsWith("0x")) {
                // Trim "0x" from the data field
                rawMessageData = errorObject.data.slice(2);
            }
            else {
                throw Error("Failed to parse data field of error object:" +
                    errorObjectStr);
            }
        }
        else {
            throw Error("Failed to parse error message from Ethereum call: " + e.message);
        }
    }
    return (0, exports.parseReasonCode)(rawMessageData);
};
exports.getTransactionError = getTransactionError;
const parseReasonCode = (messageData) => {
    // Get the length of the revert reason
    const strLen = parseInt(messageData.slice(8 + 64, 8 + 128), 16);
    // Using the length and known offset, extract and convert the revert reason
    const reasonCodeHex = messageData.slice(8 + 128, 8 + 128 + strLen * 2);
    // Convert reason from hex to string
    const reason = (0, utils_1.toUtf8String)("0x" + reasonCodeHex);
    return reason;
};
exports.parseReasonCode = parseReasonCode;
//# sourceMappingURL=transactionErrors.js.map