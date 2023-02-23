"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ethers_1 = require("ethers");
const ABIs_1 = require("./ABIs");
const regEx_1 = require("../utils/regEx");
require("axios-debug-log");
const debug = require("debug")("tx2uml");
const tokenInfoAddress = "0xbA51331Bf89570F3f55BC26394fcCA05d4063C71";
class EthereumNodeClient {
    constructor(url = "http://localhost:8545") {
        this.url = url;
        this.ethersProvider = new ethers_1.providers.JsonRpcProvider(url);
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
        const tokenInfo = new ethers_1.Contract(tokenInfoAddress, ABIs_1.TokenInfoABI, this.ethersProvider);
        try {
            const results = await tokenInfo.getInfoBatch(contractAddresses);
            debug(`Got token information for ${results.length} contracts`);
            return results.map((result, i) => ({
                address: contractAddresses[i],
                symbol: result.symbol,
                name: result.name,
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
        // parse events
        const tokenEventInterface = new ethers_1.ethers.utils.Interface(ABIs_1.TransferEventsABI);
        logs.forEach(log => {
            try {
                const event = tokenEventInterface.parseLog(log);
                if (event.name === "Transfer") {
                    transferEvents.push({
                        to: event.args.to,
                        from: event.args.from,
                        value: event.args.value,
                        tokenAddress: log.address,
                        ether: false,
                    });
                }
            }
            catch (err) {
                if (err.reason !== "no matching event")
                    throw new Error("Failed to parse event log", { cause: err });
            }
        });
        return transferEvents;
    }
}
exports.default = EthereumNodeClient;
//# sourceMappingURL=EthereumNodeClient.js.map