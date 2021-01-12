"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ethers_1 = require("ethers");
const verror_1 = require("verror");
const regEx_1 = require("../utils/regEx");
require("axios-debug-log");
const tokenInfoAddress = "0xbA51331Bf89570F3f55BC26394fcCA05d4063C71";
const TokenInfoABI = [
    {
        inputs: [
            { internalType: "address[]", name: "tokens", type: "address[]" },
        ],
        name: "getInfoBatch",
        outputs: [
            {
                components: [
                    { internalType: "string", name: "symbol", type: "string" },
                    { internalType: "string", name: "name", type: "string" },
                ],
                internalType: "struct TokenInfo.Info[]",
                name: "infos",
                type: "tuple[]",
            },
        ],
        stateMutability: "view",
        type: "function",
    },
];
class EthereumNodeClient {
    constructor(url = "http://localhost:8545", network = "mainnet") {
        this.url = url;
        this.network = network;
        this.ethersProvider = new ethers_1.providers.JsonRpcProvider(url, network);
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
    async getTokenDetails(contractAddresses) {
        const tokenInfo = new ethers_1.Contract(tokenInfoAddress, TokenInfoABI, this.ethersProvider);
        const results = await tokenInfo.getInfoBatch(contractAddresses);
        return results.map((result, i) => ({
            address: contractAddresses[i],
            ...result,
        }));
    }
}
exports.default = EthereumNodeClient;
//# sourceMappingURL=EthereumNodeClient.js.map