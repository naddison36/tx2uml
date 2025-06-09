#! /usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = require("commander");
const path_1 = require("path");
const callDiagram_1 = require("./callDiagram");
const valueDiagram_1 = require("./valueDiagram");
const validators_1 = require("./utils/validators");
const tx2umlTypes_1 = require("./types/tx2umlTypes");
const copyTransactions_1 = require("./copyTransactions");
const debugControl = require("debug");
const debug = require("debug")("tx2uml");
const program = new commander_1.Command();
program
    .usage("[command] <options>")
    .description("Ethereum transaction visualizer that generates UML sequence diagrams from an Ethereum archive node and Etherscan like block explorer")
    .addOption(new commander_1.Option("-f, --outputFormat <value>", "output file format")
    .choices(tx2umlTypes_1.outputFormats)
    .default("svg"))
    .option("-o, --outputFileName <value>", "output file name. Defaults to shortened tx hashes joined together with a 'v' prefix for value transfer diagrams.")
    .addOption(new commander_1.Option("-u, --url <url>", "URL of the archive node with trace transaction support")
    .env("ARCHIVE_NODE_URL")
    .default("http://localhost:8545"))
    .addOption(new commander_1.Option("-c, --chain <value>", "Name or chain id of the blockchain explorer to get contract source code from. `none` will not get any source code. `custom` will use the `explorerUrl` option. A name like `ethereum` or `base` will map to a chain id, eg 1 or 8453. Alternatively, use an integer of the chain id. Supported names: " +
    tx2umlTypes_1.networks.join(", "))
    .default("ethereum")
    .env("ETH_NETWORK"))
    .addOption(new commander_1.Option("-e, --explorerUrl <url>", "required if a `custom` chain is used. eg a testnet like Polygon Mumbai https://api-testnet.polygonscan.com/api").env("EXPLORER_URL"))
    .addOption(new commander_1.Option("-k, --etherscanKey <value>", "Etherscan like block explorer API key")
    .env("EXPLORER_API_KEY")
    .makeOptionMandatory())
    .option("-cf, --configFile <value>", "name of the json configuration file that can override contract details like name and ABI", "tx.config.json")
    .option("-af, --abiFile <value>", "name of the json abi file that can override contract details like ABI", "tx.abi.json")
    .option("-m, --memory <gigabytes>", "max Java memory of PlantUML process in gigabytes. Java default is 1/4 of physical memory. Large txs in png format will need up to 12g. svg format is much better for large transactions.")
    .option("--title <value>", "Diagram title at the top (default: tx hash)")
    .option("-hf, --hideFooter", "Hides the boxes at the bottom of the contract lifelines.", false)
    .option("-hc, --hideCaption", "Hides the network, block number and timestamp at the bottom of the diagram.", false)
    .option("-v, --verbose", "run with debugging statements", false);
const version = (0, path_1.basename)(__dirname) === "lib"
    ? require("../package.json").version // used when run from compile js in /lib
    : require("../../package.json").version; // used when run from TypeScript source files under src/ts via ts-node
program.version(version);
program
    .command("call", { isDefault: true })
    .argument("<txHash(s)>", "transaction hash or an array of hashes in hexadecimal format with a 0x prefix. If running for multiple transactions, the comma-separated list of transaction hashes must not have white spaces", validators_1.validateHashes)
    .usage("<txhash(s)> [options]")
    .description("Generates a UML sequence diagram of transaction contract calls between contracts (default).")
    .addOption(new commander_1.Option("-n, --nodeType <value>", "type of Ethereum node the provider url is pointing to. This determines which trace API is used")
    .choices(tx2umlTypes_1.nodeTypes)
    .env("ARCHIVE_NODE_TYPE")
    .default("geth"))
    .option("-a, --noAddresses <value>", "hide calls to contracts in a list of comma-separated addresses with a 0x prefix", validators_1.validateAddresses)
    .option("-d, --depth <value>", "limit the transaction call depth", validators_1.validateDepth)
    .option("-e, --noEther", "hide ether values", false)
    .option("-g, --noGas", "hide gas usages", false)
    .option("-l, --noLogDetails", "hide log details emitted from contract events", false)
    .option("-p, --noParams", "hide function parameter names and values", false)
    .option("-pv, --noParamValues", 'only hide function parameter values, not the names. Will display "?" if the name is not specified in the ABI', false)
    .option("-t, --noTxDetails", "hide transaction details like nonce, gas and tx fee", false)
    .option("-x, --noDelegates", "hide delegate calls from proxy contracts to their implementations and calls to deployed libraries", false)
    .option("--mapSource <mapped-source>", `Maps contracts to similar verified contracts on Etherscan. Useful for factory deployed contracts.
Left of the colon ":" is a comma-separated list of addresses that don't have verified source code.
In them middle is colon ":" that separates the two lists.
Right of the colon ":" is a comma-separated list of addresses that have verified source code. 
For example: --mapSource 0x88e6a0c2ddd26feeb64f039a2c41296fcb3f5640:0x8f8EF111B67C04Eb1641f5ff19EE54Cda062f163`, validators_1.validateMappedAddresses)
    .action(async (hashes, options, command) => {
    debug(`About to generate tx calls for ${hashes}`);
    const outputFilename = (0, validators_1.parseFilename)(command.parent._optionValues.outputFileName, hashes);
    try {
        await (0, callDiagram_1.generateCallDiagram)(hashes, {
            ...command.parent._optionValues,
            ...options,
            outputFilename,
        });
    }
    catch (err) {
        console.error(err);
        process.exit(10);
    }
});
program
    .command("value")
    .argument("<txHash(s)>", "transaction hash or an array of hashes in hexadecimal format with a 0x prefix. If running for multiple transactions, the comma-separated list of transaction hashes must not have white spaces", validators_1.validateHashes)
    .usage("<txhash(s)> [options]")
    .description(`Generates a UML sequence diagram of token and ether value transfers between accounts and contracts. This requires an archive node that supports debug_traceTransaction with custom EVM tracers which are Geth, Erigon or Anvil.`)
    .option("-e, --onlyToken", "get transfers only from token events. No ETH transfers will be included. Use when provider does not support debug_traceTransaction with custom tracer.", false)
    .option("--mapSource <mapped-source>", `Maps contracts to similar verified contracts on Etherscan. Useful for factory deployed contracts.
Left of the colon ":" is a comma-separated list of addresses that don't have verified source code.
In them middle is colon ":" that separates the two lists.
Right of the colon ":" is a comma-separated list of addresses that have verified source code. 
For example: --mapSource 0x88e6a0c2ddd26feeb64f039a2c41296fcb3f5640:0x8f8EF111B67C04Eb1641f5ff19EE54Cda062f163`, validators_1.validateMappedAddresses)
    .option("-hb, --hideBalances", "Hides the changes in ether and token balances at the bottom.", false)
    .action(async (hashes, options, command) => {
    debug(`About to generate value transfers for ${hashes}`);
    const outputFilename = (0, validators_1.parseFilename)(command.parent._optionValues.outputFileName, hashes, true);
    try {
        await (0, valueDiagram_1.generateValueDiagram)(hashes, {
            ...command.parent._optionValues,
            ...options,
            outputFilename,
        });
    }
    catch (err) {
        console.error(err);
        process.exit(11);
    }
});
program
    .command("copy")
    .argument("<txHash(s)>", "transaction hash or an array of hashes in hexadecimal format with a 0x prefix. If running for multiple transactions, the comma-separated list of transaction hashes must not have white spaces", validators_1.validateHashes)
    .usage("<txhash(s)> [options]")
    .description("Copies one or more transactions from one chain to another. This is either relayed with the original signature or impersonated with a different signer.")
    .addOption(new commander_1.Option("-du, --destUrl <url>", "url of the node provider the transaction is being copied to")
    .env("DEST_NODE_URL")
    .default("http://localhost:8545"))
    .option("-i, --impersonate <address>", "Address of the account that is to be impersonated. This only works for development nodes like Hardhat and Anvil. The default is the transaction is relayed so is from the original signer.", validators_1.validateAddress)
    .action(async (hashes, options, command) => {
    debug(`About to copy tx calls for ${hashes}`);
    try {
        await (0, copyTransactions_1.copyTransactions)(hashes, {
            ...command.parent._optionValues,
            ...options,
        });
    }
    catch (err) {
        console.error(err);
        process.exit(20);
    }
});
program.on("option:verbose", () => {
    debugControl.enable("tx2uml,axios");
    debug("verbose on");
});
const main = async () => {
    await program.parseAsync(process.argv);
};
main();
//# sourceMappingURL=tx2uml.js.map