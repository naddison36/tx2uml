import EthereumNodeClient from "./clients/EthereumNodeClient"
import EtherscanClient from "./clients/EtherscanClient"
import { TransactionManager } from "./transaction"
import { traces2PumlStream } from "./tracesPumlStreamer"
import { generateFile } from "./fileGenerator"
import OpenEthereumClient from "./clients/OpenEthereumClient"
import GethClient from "./clients/GethClient"
import { TransactionDetails, CallDiagramOptions } from "./types/tx2umlTypes"

const debug = require("debug")("tx2uml")

export const generateCallDiagram = async (
    hashes: string[],
    options: CallDiagramOptions
) => {
    const ethereumNodeClient = ((): EthereumNodeClient => {
        switch (options.nodeType) {
            case "openeth":
            case "nether":
            case "anvil":
            case "besu":
                debug("Using OpenEthereum client.")
                return new OpenEthereumClient(options.url, options.chain)
            default:
                debug("Using Geth client.")
                return new GethClient(options.url, options.chain)
        }
    })()

    const etherscanClient = new EtherscanClient(
        options.etherscanKey,
        options.chain
    )
    const txManager = new TransactionManager(
        ethereumNodeClient,
        etherscanClient
    )

    let transactions: TransactionDetails[] = await txManager.getTransactions(
        hashes,
        options.chain
    )

    const transactionTracesUnfiltered = await txManager.getTraces(transactions)
    const contracts = await txManager.getContractsFromTraces(
        transactionTracesUnfiltered,
        options.configFile,
        options.chain
    )
    TransactionManager.parseTraceParams(transactionTracesUnfiltered, contracts)
    const [transactionTraces, usedContracts] =
        TransactionManager.filterTransactionTraces(
            transactionTracesUnfiltered,
            contracts,
            {
                ...options,
                excludedContracts: options.noAddresses,
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
        options
    )

    await generateFile(pumlStream, options)
}
