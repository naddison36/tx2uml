"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = __importDefault(require("axios"));
const ethers_1 = require("ethers");
const verror_1 = require("verror");
const transaction_1 = require("../transaction");
const regEx_1 = require("../utils/regEx");
require("axios-debug-log");
const debug = require("debug")("tx2uml");
class GethClient {
    constructor(url = "http://localhost:8545", network = "mainnet") {
        this.url = url;
        this.network = network;
        this.jsonRpcId = 0;
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
            addTraces(response.data.result, traces, 0);
            debug(`Got ${traces.length} traces actions for tx hash ${txHash} from ${this.url}`);
            return traces;
        }
        catch (err) {
            throw new verror_1.VError(err, `Failed to get transaction trace for tx hash ${txHash} from url ${this.url}.`);
        }
    }
}
exports.default = GethClient;
// Adds calls from a Geth debug_traceTransaction API response to the traces
const addTraces = (callResponse, traces, id, parentTrace) => {
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
        error: callResponse.error,
    };
    if (parentTrace) {
        parentTrace.childTraces.push(newTrace);
    }
    traces.push(newTrace);
    if (callResponse.calls) {
        callResponse.calls.forEach(childCall => {
            // recursively add traces
            id = addTraces(childCall, traces, id, newTrace);
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
//# sourceMappingURL=GethClient.js.map