"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateCallDiagram = void 0;
const EtherscanClient_1 = __importDefault(require("./clients/EtherscanClient"));
const transaction_1 = require("./transaction");
const regEx_1 = require("./utils/regEx");
const tracesPumlStreamer_1 = require("./tracesPumlStreamer");
const fileGenerator_1 = require("./fileGenerator");
const OpenEthereumClient_1 = __importDefault(require("./clients/OpenEthereumClient"));
const GethClient_1 = __importDefault(require("./clients/GethClient"));
const debug = require("debug")("tx2uml");
const generateCallDiagram = async (hashes, options) => {
    const ethereumNodeClient = (() => {
        switch (options.nodeType) {
            case "openeth":
            case "nether":
            case "anvil":
            case "besu":
                debug("Using OpenEthereum client.");
                return new OpenEthereumClient_1.default(options.url);
            default:
                debug("Using Geth client.");
                return new GethClient_1.default(options.url);
        }
    })();
    let depth;
    if (options.depth) {
        try {
            depth = parseInt(options.depth);
        }
        catch (err) {
            console.error(`Invalid depth "${options.depth}". Must be an integer.`);
            process.exit(3);
        }
    }
    const excludedContracts = options.noAddresses
        ? options.noAddresses.split(",")
        : [];
    const etherscanClient = new EtherscanClient_1.default(options.etherscanKey, options.chain);
    const txManager = new transaction_1.TransactionManager(ethereumNodeClient, etherscanClient);
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
    const transactionTracesUnfiltered = await txManager.getTraces(transactions);
    const contracts = await txManager.getContractsFromTraces(transactionTracesUnfiltered, options.configFile);
    transaction_1.TransactionManager.parseTraceParams(transactionTracesUnfiltered, contracts);
    const [transactionTraces, usedContracts] = transaction_1.TransactionManager.filterTransactionTraces(transactionTracesUnfiltered, contracts, {
        ...options,
        excludedContracts,
    });
    transaction_1.TransactionManager.parseTraceDepths(transactionTraces, usedContracts);
    transactions.forEach(tx => transaction_1.TransactionManager.parseTransactionLogs(tx.logs, usedContracts));
    const pumlStream = (0, tracesPumlStreamer_1.traces2PumlStream)(transactions, transactionTraces, usedContracts, {
        ...options,
        depth,
    });
    let filename = options.outputFileName;
    if (!filename) {
        filename = hashes?.match(regEx_1.transactionHash) ? hashes : "output";
    }
    await (0, fileGenerator_1.generateFile)(pumlStream, {
        format: options.outputFormat,
        filename,
    });
};
exports.generateCallDiagram = generateCallDiagram;
//# sourceMappingURL=callDiagram.js.map