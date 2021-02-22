"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseReasonCode = void 0;
const axios_1 = __importDefault(require("axios"));
const ethers_1 = require("ethers");
const verror_1 = require("verror");
const transaction_1 = require("../transaction");
const regEx_1 = require("../utils/regEx");
const utils_1 = require("ethers/lib/utils");
const EthereumNodeClient_1 = __importDefault(require("./EthereumNodeClient"));
require("axios-debug-log");
const debug = require("debug")("tx2uml");
class GethClient extends EthereumNodeClient_1.default {
    constructor(url = "http://localhost:8545", network = "mainnet") {
        super(url, network);
        this.url = url;
        this.network = network;
        this.jsonRpcId = 0;
        this.provider = new ethers_1.providers.JsonRpcProvider(url, network);
    }
    async getTransactionTrace(txHash) {
        var _a, _b, _c, _d, _e, _f, _g;
        if (!(txHash === null || txHash === void 0 ? void 0 : txHash.match(regEx_1.transactionHash))) {
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
            if ((_b = (_a = response.data) === null || _a === void 0 ? void 0 : _a.error) === null || _b === void 0 ? void 0 : _b.message) {
                throw new Error(response.data.error.message);
            }
            if (!((_d = (_c = response === null || response === void 0 ? void 0 : response.data) === null || _c === void 0 ? void 0 : _c.result) === null || _d === void 0 ? void 0 : _d.from)) {
                if ((_f = (_e = response === null || response === void 0 ? void 0 : response.data) === null || _e === void 0 ? void 0 : _e.result) === null || _f === void 0 ? void 0 : _f.structLogs) {
                    throw new Error(`Have you set the --nodeType option correctly? It looks like a debug_traceTransaction was run against a node that doesn't support tracing in their debugging API.`);
                }
                throw new Error(`no transaction trace messages in response. ${(_g = response === null || response === void 0 ? void 0 : response.data) === null || _g === void 0 ? void 0 : _g.result}`);
            }
            // recursively add the traces
            const traces = [];
            addTraces(response.data.result, traces, 0, 0);
            debug(`Got ${traces.length} traces actions for tx hash ${txHash} from ${this.url}`);
            return traces;
        }
        catch (err) {
            throw new verror_1.VError(err, `Failed to get transaction trace for tx hash ${txHash} from url ${this.url}.`);
        }
    }
    async getTransactionError(tx) {
        var _a, _b;
        if (!(tx === null || tx === void 0 ? void 0 : tx.hash.match(regEx_1.transactionHash))) {
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
                utils_1.hexlify(tx.blockNumber - 1).replace(/^0x0/, "0x"),
            ];
            const response = await axios_1.default.post(this.url, {
                id: this.jsonRpcId++,
                jsonrpc: "2.0",
                method: "eth_call",
                params,
            });
            return (_b = (_a = response.data) === null || _a === void 0 ? void 0 : _a.error) === null || _b === void 0 ? void 0 : _b.message;
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
        return exports.parseReasonCode(rawMessageData);
    }
}
exports.default = GethClient;
// Adds calls from a Geth debug_traceTransaction API response to the traces
const addTraces = (callResponse, traces, id, depth, parentTrace) => {
    var _a;
    const type = convertType(callResponse);
    const delegatedFrom = (parentTrace === null || parentTrace === void 0 ? void 0 : parentTrace.type) === transaction_1.MessageType.DelegateCall
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
        funcSelector: ((_a = callResponse.input) === null || _a === void 0 ? void 0 : _a.length) >= 10
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
    const reason = utils_1.toUtf8String("0x" + reasonCodeHex);
    return reason;
};
exports.parseReasonCode = parseReasonCode;
//# sourceMappingURL=GethClient.js.map