"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = __importDefault(require("axios"));
const ethers_1 = require("ethers");
const transaction_1 = require("../transaction");
const regEx_1 = require("../utils/regEx");
const utils_1 = require("ethers/lib/utils");
const EthereumNodeClient_1 = __importDefault(require("./EthereumNodeClient"));
require("axios-debug-log");
const debug = require("debug")("tx2uml");
class OpenEthereumClient extends EthereumNodeClient_1.default {
    constructor(url = "http://localhost:8545", network = "mainnet") {
        super(url, network);
        this.url = url;
        this.network = network;
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
                method: "trace_replayTransaction",
                params: [txHash, ["trace"]],
            });
            if (response.data?.error?.message) {
                throw new Error(response.data.error.message);
            }
            if (!(response?.data?.result?.trace?.length > 0)) {
                throw new Error(`no transaction trace messages in response: ${response?.data}`);
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
                    ? trace.action?.address
                    : trace.action?.from;
                const delegatedFrom = parentTrace?.type === transaction_1.MessageType.DelegateCall
                    ? parentTrace.to
                    : from;
                const to = (() => {
                    switch (type) {
                        case transaction_1.MessageType.Create:
                            return trace.result?.address;
                        case transaction_1.MessageType.Selfdestruct:
                            return trace.action?.refundAddress;
                        default:
                            return trace.action?.to;
                    }
                })();
                const inputs = type === transaction_1.MessageType.Create
                    ? trace.action?.init
                    : trace.action?.input;
                const outputs = type === transaction_1.MessageType.Create
                    ? trace.result?.code
                    : trace.result?.output;
                const newTrace = {
                    id: id++,
                    type,
                    from,
                    delegatedFrom,
                    to,
                    value: trace.action?.value
                        ? convertBigNumber(trace.action?.value)
                        : ethers_1.BigNumber.from(0),
                    inputs,
                    inputParams: [],
                    funcSelector: trace.action.input?.length >= 10
                        ? trace.action.input.slice(0, 10)
                        : undefined,
                    outputs,
                    outputParams: [],
                    gasLimit: convertBigNumber(trace?.action.gas),
                    gasUsed: convertBigNumber(trace.result?.gasUsed),
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
            throw new Error(`Failed to get transaction trace for tx hash ${txHash} from url ${this.url}.`, { cause: err });
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
            const response = await axios_1.default.post(this.url, {
                id: this.jsonRpcId++,
                jsonrpc: "2.0",
                method: "eth_call",
                params,
            });
            return response.data?.error?.data;
        }
        catch (err) {
            throw new Error(`Failed to get transaction trace for tx hash ${tx.hash} from url ${this.url}.`, { cause: err });
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