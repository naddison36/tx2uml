"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateCallDiagram = void 0;
const EtherscanClient_1 = __importDefault(require("./clients/EtherscanClient"));
const transaction_1 = require("./transaction");
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
                return new OpenEthereumClient_1.default(options.url, options.chain);
            default:
                debug("Using Geth client.");
                return new GethClient_1.default(options.url, options.chain);
        }
    })();
    const etherscanClient = new EtherscanClient_1.default(options.etherscanKey, options.chain);
    const txManager = new transaction_1.TransactionManager(ethereumNodeClient, etherscanClient);
    let transactions = await txManager.getTransactions(hashes, options.chain);
    const transactionTracesUnfiltered = await txManager.getTraces(transactions);
    const contracts = await txManager.getContractsFromTraces(transactionTracesUnfiltered, options.configFile, options.chain);
    transaction_1.TransactionManager.parseTraceParams(transactionTracesUnfiltered, contracts);
    const [transactionTraces, usedContracts] = transaction_1.TransactionManager.filterTransactionTraces(transactionTracesUnfiltered, contracts, {
        ...options,
        excludedContracts: options.noAddresses,
    });
    transaction_1.TransactionManager.parseTraceDepths(transactionTraces, usedContracts);
    transactions.forEach(tx => transaction_1.TransactionManager.parseTransactionLogs(tx.logs, usedContracts));
    const pumlStream = (0, tracesPumlStreamer_1.traces2PumlStream)(transactions, transactionTraces, usedContracts, options);
    await (0, fileGenerator_1.generateFile)(pumlStream, options);
};
exports.generateCallDiagram = generateCallDiagram;
//# sourceMappingURL=callDiagram.js.map