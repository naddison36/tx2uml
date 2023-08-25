"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateValueDiagram = void 0;
const tx2umlTypes_1 = require("./types/tx2umlTypes");
const GethClient_1 = __importDefault(require("./clients/GethClient"));
const EtherscanClient_1 = __importDefault(require("./clients/EtherscanClient"));
const transfersPumlStreamer_1 = require("./transfersPumlStreamer");
const fileGenerator_1 = require("./fileGenerator");
const EthereumNodeClient_1 = __importDefault(require("./clients/EthereumNodeClient"));
const transaction_1 = require("./transaction");
const utils_1 = require("ethers/lib/utils");
const generateValueDiagram = async (hashes, options) => {
    const gethClient = new GethClient_1.default(options.url, options.chain);
    // Initiate Etherscan client
    const etherscanClient = new EtherscanClient_1.default(options.etherscanKey, options.chain, options.explorerUrl);
    const txManager = new transaction_1.TransactionManager(gethClient, etherscanClient);
    let transactions = await txManager.getTransactions(hashes, options.chain);
    const transactionTransfers = options.onlyToken
        ? await getTransfersFromEvents(hashes, transactions)
        : await getTransfersFromTrace(hashes, transactions, gethClient);
    // Get all the participating contracts from the transfers
    const participants = await txManager.getTransferParticipants(transactionTransfers, transactions[0].blockNumber, options.chain, options.configFile, options.mapSource);
    // Convert transactions and transfers to readable stream
    const pumlStream = (0, transfersPumlStreamer_1.transfers2PumlStream)(transactions, transactionTransfers, participants, options.chain);
    // Pipe readable stream to PlantUML's Java process which then writes to a file
    await (0, fileGenerator_1.generateFile)(pumlStream, options);
};
exports.generateValueDiagram = generateValueDiagram;
const getTransfersFromTrace = async (hashes, transactions, gethClient) => {
    // Get Ether and ERC20 transfers from custom EVM tx tracer
    // The values of the ERC20 transfers may not be correct.
    // Transactions -> Transfers
    const transactionTransfers = [];
    for (const txHash of hashes) {
        transactionTransfers.push(await gethClient.getValueTransfers(txHash));
    }
    // For each tx, update the trace transfer value with the value from the tx receipt logs
    transactions.forEach((tx, i) => {
        // get ERC20 Transfer events from logs in the tx receipt
        const eventTransfers = EthereumNodeClient_1.default.parseTransferEvents(tx.logs);
        // Filter out any Ether transfers. Only want ERC20 transfers
        const traceTransfers = transactionTransfers[i].filter(t => t.tokenAddress);
        if (eventTransfers.length !== traceTransfers.length) {
            throw Error(`${eventTransfers.length} event transfers in tx ${tx.hash} does not match ${traceTransfers.length} trace transfers`);
        }
        traceTransfers.forEach((traceTransfer, i) => {
            // Update the trace transfer value with the event's Transfer value
            traceTransfer.from = eventTransfers[i].from;
            traceTransfer.to = eventTransfers[i].to;
            traceTransfer.value = eventTransfers[i].value;
            traceTransfer.event = eventTransfers[i].event;
            traceTransfer.type = eventTransfers[i].type;
        });
    });
    // If the tx is transferring ETH then add as the first transfer
    transactions.forEach((tx, i) => {
        if (tx.value?.gt(0)) {
            transactionTransfers[i].unshift({
                from: (0, utils_1.getAddress)(tx.from),
                to: (0, utils_1.getAddress)(tx.to),
                value: tx.value,
                pc: 0,
                type: tx2umlTypes_1.TransferType.Transfer,
            });
        }
    });
    return transactionTransfers;
};
const getTransfersFromEvents = async (hashes, transactions) => {
    // Get Ether and ERC20 transfers from custom EVM tx tracer
    // The values of the ERC20 transfers may not be correct.
    // Transactions -> Transfers
    const transactionTransfers = [];
    // For each tx, update the trace transfer value with the value from the tx receipt logs
    transactions.forEach((tx, i) => {
        // get ERC20 Transfer events from logs in the tx receipt
        transactionTransfers[i] = EthereumNodeClient_1.default.parseTransferEvents(tx.logs);
    });
    return transactionTransfers;
};
//# sourceMappingURL=valueDiagram.js.map