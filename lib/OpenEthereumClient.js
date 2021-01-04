"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = __importDefault(require("axios"));
const ethers_1 = require("ethers");
const ethers_multicall_1 = require("ethers-multicall");
const verror_1 = require("verror");
const transaction_1 = require("./transaction");
const regEx_1 = require("./utils/regEx");
const utils_1 = require("ethers/lib/utils");
require("axios-debug-log");
const debug = require("debug")("tx2uml");
const stringTokenABI = [
    {
        constant: true,
        inputs: [],
        name: "symbol",
        outputs: [
            {
                name: "",
                type: "string",
            },
        ],
        payable: false,
        stateMutability: "view",
        type: "function",
    },
    {
        constant: true,
        inputs: [],
        name: "name",
        outputs: [
            {
                name: "",
                type: "string",
            },
        ],
        payable: false,
        stateMutability: "view",
        type: "function",
    },
];
// Deep copy string output ABI and change to bytes32 ABI
const bytes32TokenABI = JSON.parse(JSON.stringify(stringTokenABI));
bytes32TokenABI[0].outputs[0].type = "bytes32";
bytes32TokenABI[1].outputs[0].type = "bytes32";
class OpenEthereumClient {
    constructor(url = "http://localhost:8545", network = "mainnet") {
        this.url = url;
        this.network = network;
        this.jsonRpcId = 0;
        this.ethersProvider = new ethers_1.providers.JsonRpcProvider(url, network);
        this.multicallProvider = new ethers_multicall_1.Provider(this.ethersProvider, 1);
    }
    async getTransactionDetails(txHash) {
        if (!(txHash === null || txHash === void 0 ? void 0 : txHash.match(regEx_1.transactionHash))) {
            throw new TypeError(`Transaction hash "${txHash}" must be 32 bytes in hexadecimal format with a 0x prefix`);
        }
        try {
            // get the transaction and receipt concurrently
            const txPromise = this.ethersProvider.getTransaction(txHash);
            const receiptPromise = this.ethersProvider.getTransactionReceipt(txHash);
            const [tx, receipt] = await Promise.all([txPromise, receiptPromise]);
            const block = await this.ethersProvider.getBlock(receipt.blockNumber);
            return {
                hash: tx.hash,
                from: tx.from,
                to: tx.to,
                nonce: tx.nonce,
                index: receipt.transactionIndex,
                value: tx.value,
                gasLimit: tx.gasLimit,
                gasPrice: tx.gasPrice,
                gasUsed: receipt.gasUsed,
                timestamp: new Date(block.timestamp * 1000),
                status: receipt.status === 1,
            };
        }
        catch (err) {
            throw new verror_1.VError(err, `Failed to get transaction details for tx hash ${txHash} from url ${this.url}.`);
        }
    }
    async getTokenDetailsKnownABI(contract) {
        const callPromises = [];
        const multicallContract = new ethers_multicall_1.Contract(contract.address, contract.interface.fragments);
        callPromises.push(multicallContract.symbol());
        callPromises.push(multicallContract.name());
        const [symbolRaw, nameRaw] = await this.multicallProvider.all(callPromises);
        const symbol = convertOutput2String(symbolRaw);
        const name = convertOutput2String(nameRaw);
        debug(`Got token details ${name} (${symbol}) for ${contract.address}`);
        return {
            address: contract.address,
            symbol,
            name,
        };
    }
    // Attempts to get the `symbol` and `name` properties from a contract even if the ABI is unknown or
    // the `symbol` and `name` properties are not on the contract's ABI.
    // This is to get the token details from proxy contracts or contracts that are not verified on Etherscan
    async getTokenDetailsUnknownABI(address) {
        var _a, _b;
        const tokenDetails = await this._getTokenDetails(address, stringTokenABI);
        if (((_a = tokenDetails.symbol) === null || _a === void 0 ? void 0 : _a.length) > 0 && ((_b = tokenDetails.name) === null || _b === void 0 ? void 0 : _b.length) > 0) {
            return tokenDetails;
        }
        return await this._getTokenDetails(address, bytes32TokenABI);
    }
    async _getTokenDetails(address, tokenABI) {
        try {
            const callPromises = [];
            const stringABIContract = new ethers_multicall_1.Contract(address, tokenABI);
            callPromises.push(stringABIContract.symbol());
            callPromises.push(stringABIContract.name());
            const [symbolRaw, nameRaw] = await this.multicallProvider.all(callPromises);
            const symbol = convertOutput2String(symbolRaw);
            const name = convertOutput2String(nameRaw);
            debug(`Got token details ${name} (${symbol}) using ${tokenABI[0].outputs[0].type} ABI from ${address}`);
            return {
                address,
                symbol,
                name,
            };
        }
        catch (err) {
            debug(`Failed to get token details using ${tokenABI[0].outputs[0].type} ABI from ${address}`);
            return {
                address,
            };
        }
    }
    async getTransactionTrace(txHash) {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m;
        if (!(txHash === null || txHash === void 0 ? void 0 : txHash.match(regEx_1.transactionHash))) {
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
            if ((_b = (_a = response.data) === null || _a === void 0 ? void 0 : _a.error) === null || _b === void 0 ? void 0 : _b.message) {
                throw new Error(response.data.error.message);
            }
            if (!((_d = (_c = response === null || response === void 0 ? void 0 : response.data) === null || _c === void 0 ? void 0 : _c.result) === null || _d === void 0 ? void 0 : _d.trace)) {
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
                    ? (_e = trace.action) === null || _e === void 0 ? void 0 : _e.address : (_f = trace.action) === null || _f === void 0 ? void 0 : _f.from;
                const delegatedFrom = (parentTrace === null || parentTrace === void 0 ? void 0 : parentTrace.type) === transaction_1.MessageType.DelegateCall
                    ? parentTrace.to
                    : from;
                const to = (() => {
                    var _a, _b, _c;
                    switch (type) {
                        case transaction_1.MessageType.Create:
                            return (_a = trace.result) === null || _a === void 0 ? void 0 : _a.address;
                        case transaction_1.MessageType.Selfdestruct:
                            return (_b = trace.action) === null || _b === void 0 ? void 0 : _b.address;
                        default:
                            return (_c = trace.action) === null || _c === void 0 ? void 0 : _c.to;
                    }
                })();
                const newTrace = {
                    id: id++,
                    type,
                    from,
                    delegatedFrom,
                    to,
                    value: ((_g = trace.action) === null || _g === void 0 ? void 0 : _g.value) ? convertBigNumber((_h = trace.action) === null || _h === void 0 ? void 0 : _h.value)
                        : ethers_1.BigNumber.from(0),
                    inputs: trace.action.input,
                    inputParams: [],
                    funcSelector: ((_j = trace.action.input) === null || _j === void 0 ? void 0 : _j.length) >= 10
                        ? trace.action.input.slice(0, 10)
                        : undefined,
                    outputs: (_k = trace.result) === null || _k === void 0 ? void 0 : _k.output,
                    outputParams: [],
                    gasLimit: convertBigNumber(trace === null || trace === void 0 ? void 0 : trace.action.gas),
                    gasUsed: convertBigNumber((_l = trace.result) === null || _l === void 0 ? void 0 : _l.gasUsed),
                    parentTrace,
                    childTraces: [],
                    constructorParams: trace.action.init,
                    address: ((_m = trace.result) === null || _m === void 0 ? void 0 : _m.address) || trace.action.address,
                    balance: convertBigNumber(trace.action.balance),
                    refundAddress: trace.action.refundAddress,
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
}
exports.default = OpenEthereumClient;
const convertOutput2String = (output) => {
    if (!output || typeof output !== "string")
        return undefined;
    return output.match(regEx_1.bytes) ? utils_1.parseBytes32String(output) : output;
};
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