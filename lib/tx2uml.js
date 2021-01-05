#! /usr/bin/env node
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const transaction_1 = require("./transaction");
const plantUmlStreamer_1 = require("./plantUmlStreamer");
const fileGenerator_1 = require("./fileGenerator");
const regEx_1 = require("./utils/regEx");
const OpenEthereumClient_1 = __importDefault(require("./clients/OpenEthereumClient"));
const EtherscanClient_1 = __importDefault(require("./clients/EtherscanClient"));
const EthereumNodeClient_1 = __importDefault(require("./clients/EthereumNodeClient"));
const GethClient_1 = __importDefault(require("./clients/GethClient"));
const debugControl = require("debug");
const debug = require("debug")("tx2uml");
const program = require("commander");
program
    .arguments("<txHash>")
    .usage(`<transaction hash or comma separated list of hashes> [options]

Ethereum transaction visualizer that generates a UML sequence diagram of transaction contract calls from an Ethereum archive node and Etherscan API.

The transaction hashes have to be in hexadecimal format with a 0x prefix. If running for multiple transactions, the comma separated list of transaction hashes must not have white spaces. eg spaces or tags.`)
    .option("-f, --outputFormat <value>", "output file format: png, svg or puml", "png")
    .option("-o, --outputFileName <value>", "output file name. Defaults to the transaction hash.")
    .option("-u, --url <url>", "URL of the archive node with trace transaction support. Can also be set with the ARCHIVE_NODE_ENV environment variable. (default: http://localhost:8545)")
    .option("-n, --nodeType <value>", "geth (GoEthereum), tgeth (Turbo-Geth), openeth (OpenEthereum, previously Parity), nether (Nethermind), besu (Hyperledger Besu).", "geth")
    .option("-p, --noParams", "Hide function params and return values.", false)
    .option("-g, --noGas", "Hide gas usages.", false)
    .option("-e, --noEther", "Hide ether values.", false)
    .option("-t, --noTxDetails", "Hide transaction details like nonce, gas and tx fee.", false)
    .option("-v, --verbose", "run with debugging statements.", false)
    .parse(process.argv);
if (program.verbose) {
    debugControl.enable("tx2uml,axios");
    debug(`Enabled tx2uml debug`);
}
const nodeTypes = ["geth", "tgeth", "openeth", "nether", "besu"];
const tx2uml = async () => {
    var _a, _b, _c;
    const url = program.url || process.env.ARCHIVE_NODE_URL || "http://localhost:8545";
    const nodeType = program.nodeType || process.env.ARCHIVE_NODE_TYPE || "geth";
    if (!nodeTypes.includes(nodeType)) {
        throw new Error(`Invalid node type "${nodeType}" set by the ARCHIVE_NODE_TYPE env var or --nodeType option. Must be one of: ${nodeTypes}`);
    }
    const tracingClient = (() => {
        switch (nodeType) {
            case "openeth":
                return new OpenEthereumClient_1.default(url);
            case "nether":
                return new OpenEthereumClient_1.default(url);
            case "besu":
                throw Error("Hyperledger Besu nodes are not currently supported");
            default:
                return new GethClient_1.default(url);
        }
    })();
    const ethersClient = new EthereumNodeClient_1.default(url);
    const etherscanClient = new EtherscanClient_1.default();
    const txManager = new transaction_1.TransactionManager(tracingClient, etherscanClient, ethersClient);
    let pumlStream;
    let transactions = [];
    if ((_a = program.args[0]) === null || _a === void 0 ? void 0 : _a.match(regEx_1.transactionHash)) {
        transactions.push(await txManager.getTransaction(program.args[0]));
    }
    else {
        try {
            const txHashes = (_b = program.args[0]) === null || _b === void 0 ? void 0 : _b.split(",");
            transactions = await txManager.getTransactions(txHashes);
        }
        catch (err) {
            console.error(`Must pass a transaction hash or an array of hashes in hexadecimal format with a 0x prefix`);
            process.exit(1);
        }
    }
    const traces = await txManager.getTraces(transactions);
    const contracts = await txManager.getContracts(traces);
    transaction_1.TransactionManager.parseTraceParams(traces, contracts);
    pumlStream = plantUmlStreamer_1.streamTxPlantUml(transactions, traces, contracts, {
        ...program,
    });
    let filename = program.outputFileName;
    if (!filename) {
        filename = ((_c = program.args[0]) === null || _c === void 0 ? void 0 : _c.match(regEx_1.transactionHash)) ? program.args[0]
            : "output";
    }
    await fileGenerator_1.generateFile(pumlStream, {
        format: program.outputFormat,
        filename,
    });
};
tx2uml()
    .then(() => {
    debug("Done!");
})
    .catch(err => {
    console.error(`Failed to generate UML diagram ${err.stack}`);
});
//# sourceMappingURL=tx2uml.js.map