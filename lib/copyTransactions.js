"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.copyTransactions = void 0;
const GethClient_1 = __importDefault(require("./clients/GethClient"));
const transactions_1 = require("./ethers/transactions");
const debug = require("debug")("tx2uml");
const copyTransactions = async (hashes, options) => {
    const source = new GethClient_1.default(options.url, options.chain);
    const destination = new GethClient_1.default(options.destUrl, options.chain);
    const destSigner = options.impersonate
        ? await destination.impersonate(options.impersonate)
        : undefined;
    for (const hash of hashes) {
        // Get the transaction from the source chains
        const sourceTx = await source.ethersProvider.getTransaction(hash);
        debug(`Got raw tx ${sourceTx.raw} for source ${hash}.`);
        let destTx;
        if (destSigner) {
            // Send the unsigned tx to the dev node to be signed and sent
            destTx = await destSigner.sendTransaction({
                to: sourceTx.to,
                data: sourceTx.data,
                value: sourceTx.value,
                gasLimit: sourceTx.gasLimit,
                gasPrice: sourceTx.gasPrice,
                accessList: sourceTx.accessList,
                // type: sourceTx.type,
                // maxFeePerGas: sourceTx.maxFeePerGas,
                // maxPriorityFeePerGas: sourceTx.maxPriorityFeePerGas,
            });
        }
        else {
            // replay transactions to destination
            const rawTx = getRawTransaction(sourceTx);
            destTx = await destination.ethersProvider.sendTransaction(rawTx);
        }
        debug(`${destTx.hash} is hash of replayed source tx ${hash}.`);
        await destTx.wait();
        debug(`${destTx.hash} replayed tx has been mined.`);
    }
};
exports.copyTransactions = copyTransactions;
// Taken from Ethers.js Cookbook
// https://docs.ethers.org/v5/cookbook/transactions/#cookbook--compute-raw-transaction
const getRawTransaction = (tx) => {
    function addKey(accum, key) {
        if (tx[key] !== undefined) {
            debug(`adding ${key}: ${tx[key]}`);
            accum[key] = tx[key];
        }
        return accum;
    }
    // Extract the relevant parts of the transaction and signature
    const txFields = "chainId data gasPrice gasLimit maxFeePerGas maxPriorityFeePerGas nonce to type value".split(" ");
    const sigFields = "v r s".split(" ");
    // Serialize the signed transaction
    const transaction = txFields.reduce(addKey, {});
    const signature = sigFields.reduce(addKey, {});
    // Ethers is strict on EIP-1559 fees ensuring the gasPrice matches the maxFeePerGas
    // so a modified version of Ethers' serialize is used without this check.
    const raw = (0, transactions_1.serialize)(transaction, signature);
    return raw;
};
//# sourceMappingURL=copyTransactions.js.map