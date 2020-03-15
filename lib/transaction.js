"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const AlethioClient_1 = require("./AlethioClient");
const EtherscanClient_1 = require("./EtherscanClient");
const regEx_1 = require("./regEx");
const debug = require("debug")("tx2uml");
var MessageType;
(function (MessageType) {
    MessageType[MessageType["Value"] = 0] = "Value";
    MessageType[MessageType["Call"] = 1] = "Call";
    MessageType[MessageType["Create"] = 2] = "Create";
    MessageType[MessageType["Selfdestruct"] = 3] = "Selfdestruct";
    MessageType[MessageType["Delegatecall"] = 4] = "Delegatecall";
})(MessageType = exports.MessageType || (exports.MessageType = {}));
exports.getTransactions = async (txHashes, options) => {
    if (Array.isArray(txHashes)) {
        const transactions = [];
        for (const txHash of txHashes) {
            if (!(txHash === null || txHash === void 0 ? void 0 : txHash.match(regEx_1.transactionHash))) {
                console.error(`Array of transaction hashes must be in hexadecimal format with a 0x prefix`);
                process.exit(1);
            }
            transactions.push(await exports.getTransaction(txHash, options));
        }
        return transactions;
    }
    if (txHashes === null || txHashes === void 0 ? void 0 : txHashes.match(regEx_1.transactionHash)) {
        return await exports.getTransaction(txHashes, options);
    }
    throw new Error(`Failed to parse tx hash or array of transactions hashes`);
};
exports.getTransaction = async (txHash, options = {}) => {
    const network = options.network || "mainnet";
    const txDetailsPromise = AlethioClient_1.getTransactionDetails(txHash, options.alethioApiKey, network);
    const messagesPromise = AlethioClient_1.getContractMessages(txHash, options.alethioApiKey, network);
    const [[details, firstMessage], contractMessages] = await Promise.all([
        txDetailsPromise,
        messagesPromise
    ]);
    return {
        messages: [firstMessage, ...contractMessages],
        details
    };
};
exports.getContracts = async (transactions, options) => {
    const participantAddresses = [];
    if (!Array.isArray(transactions)) {
        participantAddresses.push(transactions.messages[0].from);
        participantAddresses.push(...transactions.messages.map((m) => m.to));
    }
    else {
        for (const transaction of Object.values(transactions)) {
            participantAddresses.push(transaction.messages[0].from);
            participantAddresses.push(...transaction.messages.map((m) => m.to));
        }
    }
    return await getContractsFromAddresses(participantAddresses, options);
};
const getContractsFromAddresses = async (addresses, options = {}) => {
    const network = options.network || "mainnet";
    const contracts = {};
    const uniqueAddresses = new Set(addresses);
    debug(`${uniqueAddresses.size} participants in the transactions`);
    for (const address of uniqueAddresses) {
        contracts[address] = await EtherscanClient_1.getContract(address, undefined, network);
        const token = await AlethioClient_1.getToken(address, options.alethioApiKey, network);
        if (token) {
            contracts[address].tokenName = token.name;
            contracts[address].symbol = token.symbol;
        }
    }
    return contracts;
};
//# sourceMappingURL=transaction.js.map