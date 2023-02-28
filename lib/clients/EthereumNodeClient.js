"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ethers_1 = require("ethers");
const ABIs_1 = require("./ABIs");
const regEx_1 = require("../utils/regEx");
const utils_1 = require("ethers/lib/utils");
require("axios-debug-log");
const debug = require("debug")("tx2uml");
const tokenInfoAddresses = {
    mainnet: "0x190c8CB4BA6444390266CA30bDEAe4583041B14e",
    polygon: "0x2aA8dba5bd50Dc469B50b5687b75c6212DeF3E1A",
};
class EthereumNodeClient {
    constructor(url = "http://localhost:8545", network = "mainnet") {
        this.url = url;
        this.network = network;
        this.ethersProvider = new ethers_1.providers.JsonRpcProvider(url);
        if (!tokenInfoAddresses[network])
            throw Error(`Can not get token info from ${network} as TokenInfo contract has not been deployed`);
        this.tokenInfoAddress = tokenInfoAddresses[network];
    }
    async getTransactionDetails(txHash) {
        if (!txHash?.match(regEx_1.transactionHash)) {
            throw new TypeError(`Transaction hash "${txHash}" must be 32 bytes in hexadecimal format with a 0x prefix`);
        }
        try {
            debug(`About to get tx details and receipt from chain for ${txHash}`);
            // get the transaction and receipt concurrently
            const txPromise = this.ethersProvider.getTransaction(txHash);
            const receiptPromise = this.ethersProvider.getTransactionReceipt(txHash);
            const [tx, receipt] = await Promise.all([txPromise, receiptPromise]);
            if (!receipt)
                throw Error(`Failed to get transaction details and receipt for ${txHash} from ${this.url}`);
            debug(`Got tx details and receipt for ${txHash}`);
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
                maxPriorityFeePerGas: tx.maxPriorityFeePerGas,
                maxFeePerGas: tx.maxFeePerGas,
                gasUsed: receipt.gasUsed,
                timestamp: new Date(block.timestamp * 1000),
                status: receipt.status === 1,
                logs: receipt.logs,
                blockNumber: receipt.blockNumber,
            };
            // If the transaction failed, get the revert reason
            if (receipt.status === 0) {
                txDetails.error = await this.getTransactionError(txDetails);
            }
            return txDetails;
        }
        catch (err) {
            throw new Error(`Failed to get transaction details for tx hash ${txHash} from url ${this.url}.`, { cause: err });
        }
    }
    async getTokenDetails(contractAddresses) {
        const tokenInfo = new ethers_1.Contract(this.tokenInfoAddress, ABIs_1.TokenInfoABI, this.ethersProvider);
        try {
            const results = await tokenInfo.getInfoBatch(contractAddresses);
            debug(`Got token information for ${results.length} contracts`);
            return results.map((result, i) => ({
                address: contractAddresses[i],
                noContract: result.noContract,
                symbol: result.symbol,
                name: result.name,
                decimals: result.decimals.toNumber(),
            }));
        }
        catch (err) {
            console.error(`Failed to get token information for contracts: ${contractAddresses}.\nerror: ${err.message}`);
            return [];
        }
    }
    // Parse Transfer events from a transaction receipt
    static parseTransferEvents(logs) {
        const transferEvents = [];
        logs.forEach((log, i) => {
            try {
                // Only try and parse Transfer events with the first two params indexed
                if (log.topics[0] !==
                    "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef" ||
                    log.topics.length < 3)
                    return;
                if (log.topics.length === 3) {
                    transferEvents.push({
                        from: (0, utils_1.getAddress)((0, utils_1.hexDataSlice)(log.topics[1], 12)),
                        to: (0, utils_1.getAddress)((0, utils_1.hexDataSlice)(log.topics[2], 12)),
                        value: ethers_1.BigNumber.from(log.data),
                        tokenAddress: log.address,
                        pc: 0,
                    });
                }
                else {
                    transferEvents.push({
                        from: (0, utils_1.getAddress)((0, utils_1.hexDataSlice)(log.topics[1], 12)),
                        to: (0, utils_1.getAddress)((0, utils_1.hexDataSlice)(log.topics[2], 12)),
                        tokenId: ethers_1.BigNumber.from(log.topics[3]).toNumber(),
                        tokenAddress: log.address,
                        pc: 0,
                    });
                }
            }
            catch (err) {
                if (err.reason !== "no matching event")
                    throw new Error(`Failed to parse the event log ${i}`, {
                        cause: err,
                    });
            }
        });
        return transferEvents;
    }
}
exports.default = EthereumNodeClient;
//# sourceMappingURL=EthereumNodeClient.js.map