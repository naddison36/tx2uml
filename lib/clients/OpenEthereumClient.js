"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const axios = require("axios").default;
const ethers_1 = require("ethers");
const verror_1 = require("verror");
const transaction_1 = require("../transaction");
const regEx_1 = require("../utils/regEx");
const utils_1 = require("ethers/lib/utils");
const EthereumNodeClient_1 = __importDefault(require("./EthereumNodeClient"));
require("axios-debug-log/enable");
const debug = require("debug")("tx2uml");
class OpenEthereumClient extends EthereumNodeClient_1.default {
    constructor(url = "http://localhost:8545", network = "mainnet") {
        super(url, network);
        this.url = url;
        this.network = network;
        this.jsonRpcId = 0;
    }
    async getTransactionTrace(txHash) {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q;
        if (!(txHash === null || txHash === void 0 ? void 0 : txHash.match(regEx_1.transactionHash))) {
            throw new TypeError(`Transaction hash "${txHash}" must be 32 bytes in hexadecimal format with a 0x prefix`);
        }
        try {
            debug(`About to get transaction trace for ${txHash}`);
            const response = await axios.post(this.url, {
                id: this.jsonRpcId++,
                jsonrpc: "2.0",
                method: "trace_replayTransaction",
                params: [txHash, ["trace"]],
            });
            if ((_b = (_a = response.data) === null || _a === void 0 ? void 0 : _a.error) === null || _b === void 0 ? void 0 : _b.message) {
                throw new Error(response.data.error.message);
            }
            if (!(((_e = (_d = (_c = response === null || response === void 0 ? void 0 : response.data) === null || _c === void 0 ? void 0 : _c.result) === null || _d === void 0 ? void 0 : _d.trace) === null || _e === void 0 ? void 0 : _e.length) > 0)) {
                throw new Error(`no transaction trace messages in response: ${response === null || response === void 0 ? void 0 : response.data}`);
            }
            const traceResponses = response.data.result.trace;
            const parentTraces = [];
            const traces = [];
            let id = 0;
            for (const trace of traceResponses) {
                const traceDepth = trace.traceAddress.length;
                const parentTrace = traceDepth > 0 ? parentTraces[traceDepth - 1] : undefined;
                const type = convertType(trace);
                const from = type === transaction_1.MessageType.Selfdestruct
                    ? (_f = trace.action) === null || _f === void 0 ? void 0 : _f.address
                    : (_g = trace.action) === null || _g === void 0 ? void 0 : _g.from;
                const delegatedFrom = (parentTrace === null || parentTrace === void 0 ? void 0 : parentTrace.type) === transaction_1.MessageType.DelegateCall
                    ? parentTrace.to
                    : from;
                const to = (() => {
                    var _a, _b, _c;
                    switch (type) {
                        case transaction_1.MessageType.Create:
                            return (_a = trace.result) === null || _a === void 0 ? void 0 : _a.address;
                        case transaction_1.MessageType.Selfdestruct:
                            return (_b = trace.action) === null || _b === void 0 ? void 0 : _b.refundAddress;
                        default:
                            return (_c = trace.action) === null || _c === void 0 ? void 0 : _c.to;
                    }
                })();
                const inputs = type === transaction_1.MessageType.Create
                    ? (_h = trace.action) === null || _h === void 0 ? void 0 : _h.init
                    : (_j = trace.action) === null || _j === void 0 ? void 0 : _j.input;
                const outputs = type === transaction_1.MessageType.Create
                    ? (_k = trace.result) === null || _k === void 0 ? void 0 : _k.code
                    : (_l = trace.result) === null || _l === void 0 ? void 0 : _l.output;
                const newTrace = {
                    id: id++,
                    type,
                    from,
                    delegatedFrom,
                    to,
                    value: ((_m = trace.action) === null || _m === void 0 ? void 0 : _m.value)
                        ? convertBigNumber((_o = trace.action) === null || _o === void 0 ? void 0 : _o.value)
                        : ethers_1.BigNumber.from(0),
                    inputs,
                    inputParams: [],
                    funcSelector: ((_p = trace.action.input) === null || _p === void 0 ? void 0 : _p.length) >= 10
                        ? trace.action.input.slice(0, 10)
                        : undefined,
                    outputs,
                    outputParams: [],
                    gasLimit: convertBigNumber(trace === null || trace === void 0 ? void 0 : trace.action.gas),
                    gasUsed: convertBigNumber((_q = trace.result) === null || _q === void 0 ? void 0 : _q.gasUsed),
                    parentTrace,
                    childTraces: [],
                    depth: traceDepth,
                    error: trace.error,
                };
                if (parentTrace) {
                    parentTrace.childTraces.push(newTrace);
                }
                // update the latest parent trace for this trace depth
                if (!parentTraces[traceDepth]) {
                    parentTraces.push(newTrace);
                }
                else {
                    parentTraces[traceDepth] = newTrace;
                }
                traces.push(newTrace);
            }
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
        try {
            debug(`About to get transaction trace for ${tx.hash}`);
            const params = [
                {
                    // A Nethermind bug means the nonce of the original transaction can be used.
                    // error.data: "wrong transaction nonce"
                    // nonce: tx.nonce,
                    gasPrice: tx.gasPrice.toHexString(),
                    gas: tx.gasLimit.toHexString(),
                    value: tx.value.toHexString(),
                    from: tx.from,
                    to: tx.to,
                    data: tx.data,
                },
                (0, utils_1.hexlify)(tx.blockNumber),
            ];
            const response = await axios.post(this.url, {
                id: this.jsonRpcId++,
                jsonrpc: "2.0",
                method: "eth_call",
                params,
            });
            return (_b = (_a = response.data) === null || _a === void 0 ? void 0 : _a.error) === null || _b === void 0 ? void 0 : _b.data;
        }
        catch (err) {
            throw new verror_1.VError(err, `Failed to get transaction trace for tx hash ${tx.hash} from url ${this.url}.`);
        }
    }
}
exports.default = OpenEthereumClient;
const convertType = (trace) => {
    let type = transaction_1.MessageType.Call;
    if (trace.action.callType === "delegatecall") {
        return transaction_1.MessageType.DelegateCall;
    }
    if (trace.action.callType === "staticcall") {
        return transaction_1.MessageType.StaticCall;
    }
    if (trace.type === "create") {
        return transaction_1.MessageType.Create;
    }
    else if (trace.type === "suicide") {
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
//# sourceMappingURL=OpenEthereumClient.js.map