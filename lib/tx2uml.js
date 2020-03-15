#! /usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const transaction_1 = require("./transaction");
const plantUmlStreamer_1 = require("./plantUmlStreamer");
const fileGenerator_1 = require("./fileGenerator");
const regEx_1 = require("./regEx");
const AlethioClient_1 = require("./AlethioClient");
const debugControl = require("debug");
const debug = require("debug")("tx2uml");
const program = require("commander");
program
    .arguments("<txHash>")
    .usage(`<transaction hash or comma separated list of hashes> [options]

Ethereum transaction visualizer that generates a UML sequence diagram from transaction contract calls.

The transaction hashes have to be in hexadecimal format with a 0x prefix. If running for multiple transactions, the comma separated list of transaction hashes must not have white spaces. eg spaces or tags.`)
    .option("-f, --outputFormat <value>", "output file format: png, svg or puml", "png")
    .option("-o, --outputFileName <value>", "output file name")
    .option("-n, --network <network>", "mainnet, ropsten, kovan or rinkeby", "mainnet")
    .option("-a, --alethioApiKey <key>", "Alethio API Key")
    .option("-p, --params", "show function params and return values", false)
    .option("-g, --gas", "show gas usages", false)
    .option("-e, --ether", "show ether value", false)
    .option("-t, --transfers", "only show ether and token transfers", false)
    .option("-v, --verbose", "run with debugging statements", false)
    .parse(process.argv);
if (program.verbose) {
    debugControl.enable("tx2uml,axios");
    debug(`Enabled tx2uml debug`);
}
const tx2uml = async () => {
    var _a, _b, _c;
    const options = {
        alethioApiKey: program.alethioApiKey,
        network: program.network
    };
    let pumlStream;
    if (program.transfers) {
        const txHash = program.args[0];
        const transfers = await AlethioClient_1.getTransfers(txHash, options.alethioApiKey, options.network);
        const participants = [
            ...transfers.map(t => t.from),
            ...transfers.map(t => t.to)
        ];
        const contracts = await transaction_1.getContractsFromAddresses(participants, options);
        pumlStream = await plantUmlStreamer_1.streamTransferPuml(txHash, transfers, contracts, options);
    }
    else {
        let transactions;
        if ((_a = program.args[0]) === null || _a === void 0 ? void 0 : _a.match(regEx_1.transactionHash)) {
            transactions = await transaction_1.getTransaction(program.args[0], options);
        }
        else {
            try {
                const txHashes = (_b = program.args[0]) === null || _b === void 0 ? void 0 : _b.split(",");
                transactions = await transaction_1.getTransactions(txHashes, options);
            }
            catch (err) {
                console.error(`Must pass a transaction hash or an array of hashes in hexadecimal format with a 0x prefix`);
                process.exit(1);
            }
        }
        const contracts = await transaction_1.getContracts(transactions, options);
        pumlStream = plantUmlStreamer_1.streamTxPlantUml(transactions, contracts, {
            ...program
        });
    }
    let filename = program.outputFileName;
    if (!filename) {
        filename = ((_c = program.args[0]) === null || _c === void 0 ? void 0 : _c.match(regEx_1.transactionHash)) ? program.args[0]
            : "output";
    }
    await fileGenerator_1.generateFile(pumlStream, {
        format: program.outputFormat,
        filename
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