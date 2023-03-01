#! /usr/bin/env node
import { Command, Option } from "commander"
import { basename } from "path"
import { generateCallDiagram } from "./callDiagram"
import { generateValueDiagram } from "./valueDiagram"

const debugControl = require("debug")
const debug = require("debug")("tx2uml")

const program = new Command()

const nodeTypes = [
    "geth",
    "anvil",
    "tgeth",
    "openeth",
    "nether",
    "besu",
] as const

program
    .usage("[command] <options>")
    .description(
        "Ethereum transaction visualizer that generates UML sequence diagrams from an Ethereum archive node and Etherscan like block explorer."
    )
    .addOption(
        new Option("-f, --outputFormat <value>", "output file format.")
            .choices(["svg", "png", "eps", "puml"])
            .default("svg")
    )
    .option(
        "-o, --outputFileName <value>",
        "output file name. Defaults to the transaction hash."
    )
    .addOption(
        new Option(
            "-u, --url <url>",
            "URL of the archive node with trace transaction support."
        )
            .env("ARCHIVE_NODE_URL")
            .default("http://localhost:8545")
    )
    .addOption(
        new Option(
            "-n, --nodeType <value>",
            "geth (GoEthereum), anvil, tgeth (Erigion, fka Turbo-Geth), openeth (OpenEthereum, fka Parity), nether (Nethermind), besu (Hyperledger Besu)."
        )
            .choices(nodeTypes)
            .env("ARCHIVE_NODE_TYPE")
            .default("geth")
    )
    .addOption(
        new Option(
            "-c, --chain <value>",
            "Blockchain explorer network to get source code from."
        )
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
            .env("ETH_NETWORK")
    )
    .option(
        "-cf, --configFile <value>",
        "Name of the json configuration file that can override contract details like name and ABI.",
        "tx.config.json"
    )
    .option("-v, --verbose", "run with debugging statements.", false)

const version =
    basename(__dirname) === "lib"
        ? require("../package.json").version // used when run from compile js in /lib
        : require("../../package.json").version // used when run from TypeScript source files under src/ts via ts-node
program.version(version)

program
    .command("call", { isDefault: true })
    .argument(
        "<txHash(s)>",
        "Transaction hash or an array of hashes in hexadecimal format with a 0x prefix. If running for multiple transactions, the comma-separated list of transaction hashes must not have white spaces."
    )
    .usage("<txhash(s)> [options]")
    .description(
        "Generates a UML sequence diagram of transaction contract calls between contracts. (default)"
    )
    .option(
        "-k, --etherscanKey <value>",
        "Etherscan API key. Register your API key at https://etherscan.io/myapikey"
    )
    .option(
        "-a, --noAddresses <value>",
        "Hide calls to contracts in a list of comma-separated addresses with a 0x prefix."
    )
    .option("-d, --depth <value>", "Limit the transaction call depth.")
    .option("-e, --noEther", "Hide ether values.", false)
    .option("-g, --noGas", "Hide gas usages.", false)
    .option(
        "-l, --noLogDetails",
        "Hide log details emitted from contract events.",
        false
    )
    .option("-p, --noParams", "Hide function params and return values.", false)
    .option(
        "-t, --noTxDetails",
        "Hide transaction details like nonce, gas and tx fee.",
        false
    )
    .option(
        "-x, --noDelegates",
        "Hide delegate calls from proxy contracts to their implementations and calls to deployed libraries.",
        false
    )
    .action(async (hashes: string, options, command) => {
        debug(`About to generate tx calls for ${hashes}`)

        try {
            await generateCallDiagram(hashes, {
                ...command.parent._optionValues,
                ...options,
            })
        } catch (err) {
            console.error(err)
            process.exit(10)
        }
    })

program
    .command("value")
    .argument(
        "<txHash(s)>",
        "Transaction hash or an array of hashes in hexadecimal format with a 0x prefix. If running for multiple transactions, the comma-separated list of transaction hashes must not have white spaces."
    )
    .usage("<txhash(s)> [options]")
    .description(
        `Generates a UML sequence diagram of token and ether value transfers between accounts and contracts.

This requires an archive node that supports debug_traceTransaction with custom EVM tracers which are Geth or Erigon.`
    )
    .action(async (hashes: string, options, command) => {
        debug(`About to generate tx calls for ${hashes}`)
        try {
            await generateValueDiagram(hashes, {
                ...command.parent._optionValues,
                ...options,
            })
        } catch (err) {
            console.error(err)
            process.exit(11)
        }
    })

program.on("option:verbose", () => {
    debugControl.enable("tx2uml,axios")
    debug("verbose on")
})

const main = async () => {
    await program.parseAsync(process.argv)
}
main()
