"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ethers_1 = require("ethers");
const ethers_multicall_1 = require("ethers-multicall");
const verror_1 = require("verror");
const regEx_1 = require("../utils/regEx");
const formatters_1 = require("../utils/formatters");
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
class EthereumNodeClient {
    constructor(url = "http://localhost:8545", network = "mainnet") {
        this.url = url;
        this.network = network;
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
            const txDetails = {
                hash: tx.hash,
                from: tx.from,
                to: tx.to,
                data: tx.data,
                nonce: tx.nonce,
                index: receipt.transactionIndex,
                value: tx.value,
                gasLimit: tx.gasLimit,
                gasPrice: tx.gasPrice,
                gasUsed: receipt.gasUsed,
                timestamp: new Date(block.timestamp * 1000),
                status: receipt.status === 1,
                blockNumber: receipt.blockNumber,
            };
            // If the transaction failed, get the revert reason
            if (receipt.status === 0) {
                txDetails.error = await this.getTransactionError(txDetails);
            }
            return txDetails;
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
        const symbol = formatters_1.convertBytes32ToString(symbolRaw);
        const name = formatters_1.convertBytes32ToString(nameRaw);
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
            const symbol = formatters_1.convertBytes32ToString(symbolRaw);
            const name = formatters_1.convertBytes32ToString(nameRaw);
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
}
exports.default = EthereumNodeClient;
//# sourceMappingURL=EthereumNodeClient.js.map