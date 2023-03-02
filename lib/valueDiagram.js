"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateValueDiagram = void 0;
const tx2umlTypes_1 = require("./types/tx2umlTypes");
const regEx_1 = require("./utils/regEx");
const GethClient_1 = __importDefault(require("./clients/GethClient"));
const EtherscanClient_1 = __importDefault(require("./clients/EtherscanClient"));
const transfersPumlStreamer_1 = require("./transfersPumlStreamer");
const fileGenerator_1 = require("./fileGenerator");
const EthereumNodeClient_1 = __importDefault(require("./clients/EthereumNodeClient"));
const transaction_1 = require("./transaction");
const generateValueDiagram = async (hashes, options) => {
    // Initiate Geth client
    if (["openeth", "nether", "besu"].includes(options.nodeType)) {
        throw Error(`Value transfers diagrams are not supports for the ${options.nodeType} client which does not support the debug.traceTransaction API`);
    }
    const gethClient = new GethClient_1.default(options.url);
    // Initiate Etherscan client
    const etherscanClient = new EtherscanClient_1.default(options.etherscanKey, options.chain);
    const txManager = new transaction_1.TransactionManager(gethClient, etherscanClient);
    // Get transactions
    let transactions = [];
    if (hashes?.match(regEx_1.transactionHash)) {
        transactions.push(await txManager.getTransaction(hashes));
    }
    else {
        try {
            const txHashes = hashes?.split(",");
            transactions = await txManager.getTransactions(txHashes);
        }
        catch (err) {
            console.error(`Must pass a transaction hash or an array of hashes in hexadecimal format with a 0x prefix`);
            process.exit(4);
        }
    }
    // Get Ether and ERC20 transfers from custom EVM tx tracer
    // The values of the ERC20 transfers may not be correct.
    // Transactions -> Transfers
    const transfers = [];
    if (hashes?.match(regEx_1.transactionHash)) {
        transfers.push(await gethClient.getValueTransfers(hashes));
    }
    else {
        try {
            const txHashes = hashes?.split(",");
            for (const txHash of txHashes) {
                transfers.push(await gethClient.getValueTransfers(txHash));
            }
        }
        catch (err) {
            console.error(`Must pass a transaction hash or an array of hashes in hexadecimal format with a 0x prefix`);
            process.exit(4);
        }
    }
    // For each tx, update the trace transfer value with the value from the tx receipt logs
    transactions.forEach((tx, i) => {
        // get ERC20 Transfer events from logs in the tx receipt
        const eventTransfers = EthereumNodeClient_1.default.parseTransferEvents(tx.logs);
        // Filter out any Ether transfers. Only want ERC20 transfers
        const traceTransfers = transfers[i].filter(t => t.tokenAddress);
        if (eventTransfers.length !== traceTransfers.length) {
            throw Error(`${eventTransfers.length} event transfers in tx ${tx.hash} does not match ${traceTransfers.length} trace transfers`);
        }
        traceTransfers.forEach((traceTransfer, i) => {
            // Update the trace transfer value with the event's Transfer value
            traceTransfer.from = eventTransfers[i].from;
            traceTransfer.to = eventTransfers[i].to;
            traceTransfer.value = eventTransfers[i].value;
            traceTransfer.event = eventTransfers[i].event;
        });
    });
    // If the tx is transferring ETH then add as the first transfer
    transactions.forEach((tx, i) => {
        if (tx.value?.gt(0)) {
            transfers[i].unshift({
                from: tx.from,
                to: tx.to,
                value: tx.value,
                pc: 0,
                type: tx2umlTypes_1.TransferType.Transfer,
            });
        }
    });
    // Get all the participating contracts from the transfers
    const participants = await txManager.getTransferParticipants(transfers, transactions[0].blockNumber, options.configFile);
    // Convert transactions and transfers to readable stream
    const pumlStream = (0, transfersPumlStreamer_1.transfers2PumlStream)(transactions, transfers, participants);
    // Pipe readable stream to PlantUML's Java process which then writes to a file
    let filename = options.outputFileName;
    if (!filename) {
        filename = hashes?.match(regEx_1.transactionHash) ? hashes : "output";
    }
    await (0, fileGenerator_1.generateFile)(pumlStream, {
        format: options.outputFormat,
        filename,
    });
};
exports.generateValueDiagram = generateValueDiagram;
//# sourceMappingURL=valueDiagram.js.map