"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const AlethioClient_1 = require("./AlethioClient");
const EtherscanClient_1 = require("./EtherscanClient");
const debug = require("debug")("tx2uml");
var MessageType;
(function (MessageType) {
    MessageType[MessageType["Value"] = 0] = "Value";
    MessageType[MessageType["Call"] = 1] = "Call";
    MessageType[MessageType["Create"] = 2] = "Create";
    MessageType[MessageType["Selfdestruct"] = 3] = "Selfdestruct";
})(MessageType = exports.MessageType || (exports.MessageType = {}));
exports.getTransaction = async (txHash, options = {}) => {
    const network = options.network || "mainnet";
    const txDetailsPromise = AlethioClient_1.getTransactionDetails(txHash, options.alethioApiKey, network);
    const messagesPromise = AlethioClient_1.getContractMessages(txHash, options.alethioApiKey, network);
    const [[details, firstMessage], contractMessages] = await Promise.all([
        txDetailsPromise,
        messagesPromise
    ]);
    const messages = [firstMessage, ...contractMessages];
    const contracts = {};
    const contractAddresses = messages.map(m => m.to);
    const uniqueAddresses = new Set([firstMessage.from, ...contractAddresses]);
    debug(`${uniqueAddresses.size} participants in the transaction`);
    for (const address of uniqueAddresses) {
        contracts[address] = await EtherscanClient_1.getContract(address, options.etherscanApiKey, network);
        const token = await AlethioClient_1.getToken(address, options.alethioApiKey, network);
        if (token) {
            contracts[address].tokenName = token.name;
            contracts[address].symbol = token.symbol;
        }
    }
    return [messages, contracts, details];
};
//# sourceMappingURL=transaction.js.map