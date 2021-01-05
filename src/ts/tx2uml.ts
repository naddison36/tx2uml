#! /usr/bin/env node
import { Readable } from "stream"

import { TransactionDetails, TransactionManager } from "./transaction"
import { streamTxPlantUml } from "./plantUmlStreamer"
import { generateFile } from "./fileGenerator"
import { transactionHash } from "./utils/regEx"
import OpenEthereumClient from "./clients/OpenEthereumClient"
import EtherscanClient from "./clients/EtherscanClient"
import EthereumNodeClient from "./clients/EthereumNodeClient"
import GethClient from "./clients/GethClient"
import { ITracingClient } from "./clients"

const debugControl = require("debug")
const debug = require("debug")("tx2uml")
const program = require("commander")

program
    .arguments("<txHash>")
    .usage(
        `<transaction hash or comma separated list of hashes> [options]

Ethereum transaction visualizer that generates a UML sequence diagram of transaction contract calls from an Ethereum archive node and Etherscan API.

The transaction hashes have to be in hexadecimal format with a 0x prefix. If running for multiple transactions, the comma separated list of transaction hashes must not have white spaces. eg spaces or tags.`
    )
    .option(
        "-f, --outputFormat <value>",
        "output file format: png, svg or puml",
        "png"
    )
    .option(
        "-o, --outputFileName <value>",
        "output file name. Defaults to the transaction hash."
    )
    .option(
        "-u, --url <url>",
        "URL of the archive node with trace transaction support. Can also be set with the ARCHIVE_NODE_ENV environment variable. (default: http://localhost:8545)"
    )
    .option(
        "-n, --nodeType <value>",
        "geth (GoEthereum), tgeth (Turbo-Geth), openeth (OpenEthereum, previously Parity), nether (Nethermind), besu (Hyperledger Besu).",
        "geth"
    )
    .option("-p, --noParams", "Hide function params and return values.", false)
    .option("-g, --noGas", "Hide gas usages.", false)
    .option("-e, --noEther", "Hide ether values.", false)
    .option(
        "-t, --noTxDetails",
        "Hide transaction details like nonce, gas and tx fee.",
        false
    )
    .option("-v, --verbose", "run with debugging statements.", false)
    .parse(process.argv)

if (program.verbose) {
    debugControl.enable("tx2uml,axios")
    debug(`Enabled tx2uml debug`)
}

const nodeTypes = ["geth", "tgeth", "openeth", "nether", "besu"] as const
type NodeType = typeof nodeTypes[number]

const tx2uml = async () => {
    const url =
        program.url || process.env.ARCHIVE_NODE_URL || "http://localhost:8545"
    const nodeType: NodeType =
        program.nodeType || process.env.ARCHIVE_NODE_TYPE || "geth"
    if (!nodeTypes.includes(nodeType)) {
        throw new Error(
            `Invalid node type "${nodeType}" set by the ARCHIVE_NODE_TYPE env var or --nodeType option. Must be one of: ${nodeTypes}`
        )
    }

    const tracingClient = ((): ITracingClient => {
        switch (nodeType) {
            case "openeth":
                return new OpenEthereumClient(url)
            case "nether":
                return new OpenEthereumClient(url)
            case "besu":
                throw Error(
                    "Hyperledger Besu nodes are not currently supported"
                )
            default:
                return new GethClient(url)
        }
    })()
    const ethersClient = new EthereumNodeClient(url)
    const etherscanClient = new EtherscanClient()
    const txManager = new TransactionManager(
        tracingClient,
        etherscanClient,
        ethersClient
    )

    let pumlStream: Readable
    let transactions: TransactionDetails[] = []
    if (program.args[0]?.match(transactionHash)) {
        transactions.push(await txManager.getTransaction(program.args[0]))
    } else {
        try {
            const txHashes = program.args[0]?.split(",")
            transactions = await txManager.getTransactions(txHashes)
        } catch (err) {
            console.error(
                `Must pass a transaction hash or an array of hashes in hexadecimal format with a 0x prefix`
            )
            process.exit(1)
        }
    }

    const traces = await txManager.getTraces(transactions)
    const contracts = await txManager.getContracts(traces)
    TransactionManager.parseTraceParams(traces, contracts)

    pumlStream = streamTxPlantUml(transactions, traces, contracts, {
        ...program,
    })

    let filename = program.outputFileName
    if (!filename) {
        filename = program.args[0]?.match(transactionHash)
            ? program.args[0]
            : "output"
    }

    await generateFile(pumlStream, {
        format: program.outputFormat,
        filename,
    })
}

tx2uml()
    .then(() => {
        debug("Done!")
    })
    .catch(err => {
        console.error(`Failed to generate UML diagram ${err.stack}`)
    })
