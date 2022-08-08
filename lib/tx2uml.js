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
const GethClient_1 = __importDefault(require("./clients/GethClient"));
const commander_1 = require("commander");
const path_1 = require("path");
const debugControl = require("debug");
const debug = require("debug")("tx2uml");
const program = new commander_1.Command();
const version = (0, path_1.basename)(__dirname) === "lib"
    ? require("../package.json").version // used when run from compile js in /lib
    : require("../../package.json").version; // used when run from TypeScript source files under src/ts via ts-node
program.version(version);
const nodeTypes = [
    "geth",
    "anvil",
    "tgeth",
    "openeth",
    "nether",
    "besu",
];
program
    .arguments("<txHash>")
    .usage(`<transaction hash or comma separated list of hashes> [options]

Ethereum transaction visualizer that generates a UML sequence diagram of transaction contract calls from an Ethereum archive node and Etherscan like API.

The transaction hashes have to be in hexadecimal format with a 0x prefix. If running for multiple transactions, the comma separated list of transaction hashes must not have white spaces. eg spaces or tags.`)
    .option("-f, --outputFormat <value>", "output file format: png, svg, eps or puml", "png")
    .option("-o, --outputFileName <value>", "output file name. Defaults to the transaction hash.")
    .addOption(new commander_1.Option("-u, --url <url>", "URL of the archive node with trace transaction support.")
    .env("ARCHIVE_NODE_URL")
    .default("http://localhost:8545"))
    .addOption(new commander_1.Option("-n, --nodeType <value>", "geth (GoEthereum), anvil, tgeth (Erigion, fka Turbo-Geth), openeth (OpenEthereum, fka Parity), nether (Nethermind), besu (Hyperledger Besu).")
    .choices(nodeTypes)
    .env("ARCHIVE_NODE_TYPE")
    .default("geth"))
    .option("-p, --noParams", "Hide function params and return values.", false)
    .option("-g, --noGas", "Hide gas usages.", false)
    .option("-e, --noEther", "Hide ether values.", false)
    .option("-l, --noLogDetails", "Hide log details emitted from contract events.", false)
    .option("-t, --noTxDetails", "Hide transaction details like nonce, gas and tx fee.", false)
    .option("-x, --noDelegates", "Hide delegate calls from proxy contracts to their implementations and calls to deployed libraries.", false)
    .option("-a, --noAddresses <value>", "Hide calls to contracts in a list of comma separated addresses with a 0x prefix.")
    .option("-k, --etherscanKey <value>", "Etherscan API key. Register your API key at https://etherscan.io/myapikey")
    .addOption(new commander_1.Option("-c, --chain <value>", "Blockchain explorer network to get source code from.")
    .choices([
    "mainnet",
    "polygon",
    "bsc",
    "arbitrum",
    "ropsten",
    "kovan",
    "rinkeby",
    "goerli",
    "sepolia",
])
    .default("mainnet")
    .env("ETH_NETWORK"))
    .option("-d, --depth <value>", "Limit the transaction call depth.")
    .option("-v, --verbose", "run with debugging statements.", false)
    .parse(process.argv);
const options = program.opts();
if (options.verbose) {
    debugControl.enable("tx2uml,axios");
    debug(`Enabled tx2uml debug`);
}
const tx2uml = async () => {
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
    let pumlStream;
    let transactions = [];
    if (program.args[0]?.match(regEx_1.transactionHash)) {
        transactions.push(await txManager.getTransaction(program.args[0]));
    }
    else {
        try {
            const txHashes = program.args[0]?.split(",");
            transactions = await txManager.getTransactions(txHashes);
        }
        catch (err) {
            console.error(`Must pass a transaction hash or an array of hashes in hexadecimal format with a 0x prefix`);
            process.exit(4);
        }
    }
    const transactionTracesUnfiltered = await txManager.getTraces(transactions);
    const contracts = await txManager.getContracts(transactionTracesUnfiltered);
    transaction_1.TransactionManager.parseTraceParams(transactionTracesUnfiltered, contracts);
    const [transactionTraces, usedContracts] = transaction_1.TransactionManager.filterTransactionTraces(transactionTracesUnfiltered, contracts, {
        ...options,
        excludedContracts,
    });
    transaction_1.TransactionManager.parseTraceDepths(transactionTraces, usedContracts);
    transactions.forEach(tx => transaction_1.TransactionManager.parseTransactionLogs(tx.logs, usedContracts));
    pumlStream = (0, plantUmlStreamer_1.streamTxPlantUml)(transactions, transactionTraces, usedContracts, {
        ...options,
        depth,
    });
    let filename = options.outputFileName;
    if (!filename) {
        filename = program.args[0]?.match(regEx_1.transactionHash)
            ? program.args[0]
            : "output";
    }
    await (0, fileGenerator_1.generateFile)(pumlStream, {
        format: options.outputFormat,
        filename,
    });
};
tx2uml()
    .then(() => {
    debug("Done!");
})
    .catch(err => {
    console.error(err);
    process.exit(10);
});
//# sourceMappingURL=tx2uml.js.map