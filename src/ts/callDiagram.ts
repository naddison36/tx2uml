import EthereumNodeClient from "./clients/EthereumNodeClient"
import EtherscanClient from "./clients/EtherscanClient"
import { TransactionManager } from "./transaction"
import { transactionHash } from "./utils/regEx"
import { traces2PumlStream } from "./tracesPumlStreamer"
import { generateFile } from "./fileGenerator"
import OpenEthereumClient from "./clients/OpenEthereumClient"
import GethClient from "./clients/GethClient"
import { TransactionDetails } from "./types/tx2umlTypes"

const debug = require("debug")("tx2uml")

export const generateCallDiagram = async (hashes: string, options: any) => {
    const ethereumNodeClient = ((): EthereumNodeClient => {
        switch (options.nodeType) {
            case "openeth":
            case "nether":
            case "anvil":
            case "besu":
                debug("Using OpenEthereum client.")
                return new OpenEthereumClient(options.url)
            default:
                debug("Using Geth client.")
                return new GethClient(options.url)
        }
    })()

    let depth
    if (options.depth) {
        try {
            depth = parseInt(options.depth)
        } catch (err) {
            console.error(
                `Invalid depth "${options.depth}". Must be an integer.`
            )
            process.exit(3)
        }
    }
    const excludedContracts = options.noAddresses
        ? options.noAddresses.split(",")
        : []

    const etherscanClient = new EtherscanClient(
        options.etherscanKey,
        options.chain
    )
    const txManager = new TransactionManager(
        ethereumNodeClient,
        etherscanClient
    )

    let transactions: TransactionDetails[] = []
    if (hashes?.match(transactionHash)) {
        transactions.push(await txManager.getTransaction(hashes))
    } else {
        try {
            const txHashes = hashes?.split(",")
            transactions = await txManager.getTransactions(txHashes)
        } catch (err) {
            console.error(
                `Must pass a transaction hash or an array of hashes in hexadecimal format with a 0x prefix`
            )
            process.exit(4)
        }
    }

    const transactionTracesUnfiltered = await txManager.getTraces(transactions)
    const contracts = await txManager.getContractsFromTraces(
        transactionTracesUnfiltered,
        options.configFile
    )
    TransactionManager.parseTraceParams(transactionTracesUnfiltered, contracts)
    const [transactionTraces, usedContracts] =
        TransactionManager.filterTransactionTraces(
            transactionTracesUnfiltered,
            contracts,
            {
                ...options,
                excludedContracts,
            }
        )
    TransactionManager.parseTraceDepths(transactionTraces, usedContracts)
    transactions.forEach(tx =>
        TransactionManager.parseTransactionLogs(tx.logs, usedContracts)
    )

    const pumlStream = traces2PumlStream(
        transactions,
        transactionTraces,
        usedContracts,
        {
            ...options,
            depth,
        }
    )

    let filename = options.outputFileName
    if (!filename) {
        filename = hashes?.match(transactionHash) ? hashes : "output"
    }

    await generateFile(pumlStream, {
        format: options.outputFormat,
        filename,
    })
}
