"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseReasonCode = void 0;
const axios_1 = __importDefault(require("axios"));
const ethers_1 = require("ethers");
const transaction_1 = require("../transaction");
const regEx_1 = require("../utils/regEx");
const utils_1 = require("ethers/lib/utils");
const EthereumNodeClient_1 = __importDefault(require("./EthereumNodeClient"));
require("axios-debug-log");
const debug = require("debug")("tx2uml");
class GethClient extends EthereumNodeClient_1.default {
    constructor(url = "http://localhost:8545") {
        super(url);
        this.url = url;
        this.jsonRpcId = 0;
    }
    async getTransactionTrace(txHash) {
        if (!txHash?.match(regEx_1.transactionHash)) {
            throw new TypeError(`Transaction hash "${txHash}" must be 32 bytes in hexadecimal format with a 0x prefix`);
        }
        try {
            debug(`About to get transaction trace for ${txHash}`);
            const response = await axios_1.default.post(this.url, {
                id: this.jsonRpcId++,
                jsonrpc: "2.0",
                method: "debug_traceTransaction",
                params: [txHash, { tracer: "callTracer" }],
            });
            if (response.data?.error?.message) {
                throw new Error(response.data.error.message);
            }
            if (!response?.data?.result?.from) {
                if (response?.data?.result?.structLogs) {
                    throw new Error(`Have you set the --nodeType option correctly? It looks like a debug_traceTransaction was run against a node that doesn't support tracing in their debugging API.`);
                }
                throw new Error(`no transaction trace messages in response. ${response?.data?.result}`);
            }
            // recursively add the traces
            const traces = [];
            addTraces(response.data.result, traces, 0, 0);
            debug(`Got ${traces.length} traces actions for tx hash ${txHash} from ${this.url}`);
            return traces;
        }
        catch (err) {
            const error = new Error(`Failed to get transaction trace for tx hash ${txHash} from url ${this.url}.`, { cause: err });
            throw error;
        }
    }
    async getValueTransfers(txHash) {
        if (!txHash?.match(regEx_1.transactionHash)) {
            throw new TypeError(`Transaction hash "${txHash}" must be 32 bytes in hexadecimal format with a 0x prefix`);
        }
        try {
            debug(`About to debug transaction ${txHash}`);
            const response = await axios_1.default.post(this.url, {
                id: this.jsonRpcId++,
                jsonrpc: "2.0",
                method: "debug_traceTransaction",
                params: [
                    txHash,
                    {
                        tracer: `{
data: [],
fault: function(log) {},
step: function(log) {
    if(log.op.toString().match(/LOG[34]/) && log.stack.peek(2).toString(16) === "ddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef") {
        this.data.push({
            from: toHex(toAddress(log.stack.peek(3).toString(16))),
            to: toHex(toAddress(log.stack.peek(4).toString(16))),
            event: "Transfer",
            pc: log.getPC(),
            tokenAddress: toHex(log.contract.getAddress())})
    } else if(log.op.toString() === "LOG2" && log.stack.peek(2).toString(16) === "e1fffcc4923d04b559f4d29a8bfc6cda04eb5b0d3c460751c2402c5c5cc9109c" ) {
        this.data.push({
            from: toHex(log.contract.getAddress()),
            to: toHex(toAddress(log.stack.peek(3).toString(16))),
            event: "Deposit",
            pc: log.getPC(),
            tokenAddress: toHex(log.contract.getAddress())})
    } else if(log.op.toString() === "LOG2" && log.stack.peek(2).toString(16) === "7fcf532c15f0a6db0bd6d0e038bea71d30d808c7d98cb3bf7268a95bf5081b65" ) {
        this.data.push({
           from: toHex(toAddress(log.stack.peek(3).toString(16))),
           to: toHex(log.contract.getAddress()),
           event: "Withdraw",
           pc: log.getPC(),
           tokenAddress: toHex(log.contract.getAddress())})
    } else if(log.op.toString() == "CALL" && log.stack.length() >= 2 && log.stack.peek(2) > 0) {
        // Ether transfer in call
        this.data.push({
            from: toHex(log.contract.getAddress()),
            to: toHex(toAddress(log.stack.peek(1).toString(16))),
            value: log.stack.peek(2),
            pc: log.getPC() })
    }
},
result: function() { return this.data; }}`,
                    },
                ],
            });
            if (response.data?.error?.message) {
                throw new Error(response.data.error.message);
            }
            if (!Array.isArray(response?.data?.result)) {
                throw new Error(`No value transfers in response. ${response?.data}`);
            }
            debug(`Got ${response.data.result.length} value transfers for tx hash ${txHash}`);
            // Format address with checksum formatting
            // If zero address, use the token address
            const addressEncodedTransfers = response?.data?.result.map((t) => ({
                ...t,
                from: t.from === ethers_1.constants.AddressZero
                    ? (0, utils_1.getAddress)(t.tokenAddress)
                    : (0, utils_1.getAddress)(t.from),
                to: t.to === ethers_1.constants.AddressZero
                    ? (0, utils_1.getAddress)(t.tokenAddress)
                    : (0, utils_1.getAddress)(t.to),
                tokenAddress: t.tokenAddress
                    ? (0, utils_1.getAddress)(t.tokenAddress)
                    : undefined,
                event: t.event,
            }));
            return addressEncodedTransfers;
        }
        catch (err) {
            const error = new Error(`Failed to get value transfers for tx hash ${txHash} from url ${this.url}.`, { cause: err });
            throw error;
        }
    }
    async getTransactionError(tx) {
        if (!tx?.hash.match(regEx_1.transactionHash)) {
            throw TypeError(`There is no transaction hash on the receipt object`);
        }
        if (tx.status) {
            return undefined;
        }
        if (tx.gasUsed === tx.gasLimit) {
            throw Error("Transaction failed as it ran out of gas.");
        }
        let rawMessageData;
        try {
            const params = [
                {
                    nonce: tx.nonce,
                    gasPrice: convertBigNumber2Hex(tx.gasPrice),
                    gas: convertBigNumber2Hex(tx.gasLimit),
                    value: convertBigNumber2Hex(tx.value),
                    from: tx.from,
                    to: tx.to,
                    data: tx.data,
                },
                // need to call for the block before
                (0, utils_1.hexlify)(tx.blockNumber - 1).replace(/^0x0/, "0x"),
            ];
            const response = await axios_1.default.post(this.url, {
                id: this.jsonRpcId++,
                jsonrpc: "2.0",
                method: "eth_call",
                params,
            });
            return response.data?.error?.message;
        }
        catch (e) {
            if (e.message.startsWith("Node error: ")) {
                // Trim "Node error: "
                const errorObjectStr = e.message.slice(12);
                // Parse the error object
                const errorObject = JSON.parse(errorObjectStr);
                if (!errorObject.data) {
                    throw Error("Failed to parse data field error object:" +
                        errorObjectStr);
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
                throw Error("Failed to parse error message from Ethereum call: " +
                    e.message);
            }
        }
        return (0, exports.parseReasonCode)(rawMessageData);
    }
}
exports.default = GethClient;
// Adds calls from a Geth debug_traceTransaction API response to the traces
const addTraces = (callResponse, traces, id, depth, parentTrace) => {
    const type = convertType(callResponse);
    const delegatedFrom = parentTrace?.type === transaction_1.MessageType.DelegateCall
        ? parentTrace.to
        : callResponse.from;
    const newTrace = {
        id: id++,
        type,
        from: callResponse.from,
        delegatedFrom,
        to: callResponse.to,
        value: callResponse.value
            ? convertBigNumber(callResponse.value)
            : ethers_1.BigNumber.from(0),
        // remove trailing 64 zeros
        inputs: callResponse.input,
        inputParams: [],
        funcSelector: callResponse.input?.length >= 10
            ? callResponse.input.slice(0, 10)
            : undefined,
        outputs: callResponse.output,
        outputParams: [],
        gasLimit: convertBigNumber(callResponse.gas),
        gasUsed: convertBigNumber(callResponse.gasUsed),
        parentTrace,
        childTraces: [],
        depth,
        error: callResponse.error,
    };
    if (parentTrace) {
        parentTrace.childTraces.push(newTrace);
    }
    traces.push(newTrace);
    if (callResponse.calls) {
        callResponse.calls.forEach(childCall => {
            // recursively add traces
            id = addTraces(childCall, traces, id, depth + 1, newTrace);
        });
    }
    return id;
};
const convertType = (trace) => {
    let type = transaction_1.MessageType.Call;
    if (trace.type === "DELEGATECALL") {
        return transaction_1.MessageType.DelegateCall;
    }
    if (trace.type === "STATICCALL") {
        return transaction_1.MessageType.StaticCall;
    }
    if (trace.type === "CREATE" || trace.type === "CREATE2") {
        return transaction_1.MessageType.Create;
    }
    else if (trace.type === "SELFDESTRUCT") {
        return transaction_1.MessageType.Selfdestruct;
    }
    return type;
};
// convert an integer value to a decimal value. eg wei to Ethers which is to 18 decimal places
const convertBigNumber = (value) => {
    if (!value)
        return undefined;
    return ethers_1.BigNumber.from(value);
};
const convertBigNumber2Hex = (value) => {
    return value.toHexString().replace(/^0x0/, "0x");
};
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
//# sourceMappingURL=GethClient.js.map