import {
    TransactionDetails,
    Transfer,
    TransferPumlGenerationOptions,
    TransferType,
} from "./types/tx2umlTypes"
import GethClient from "./clients/GethClient"
import EtherscanClient from "./clients/EtherscanClient"
import { transfers2PumlStream } from "./transfersPumlStreamer"
import { generateFile } from "./fileGenerator"
import EthereumNodeClient from "./clients/EthereumNodeClient"
import { TransactionManager } from "./transaction"
import { getAddress } from "ethers/lib/utils"

export const generateValueDiagram = async (
    hashes: string[],
    options: TransferPumlGenerationOptions
) => {
    const gethClient = new GethClient(options.url, options.chain)

    // Initiate Etherscan client
    const etherscanClient = new EtherscanClient(
        options.etherscanKey,
        options.chain,
        options.explorerUrl
    )
    const txManager = new TransactionManager(gethClient, etherscanClient)

    let transactions = await txManager.getTransactions(hashes, options.chain)

    const transactionTransfers = options.onlyToken
        ? await getTransfersFromEvents(hashes, transactions)
        : await getTransfersFromTrace(hashes, transactions, gethClient)

    // Get all the participating contracts from the transfers
    const participants = await txManager.getTransferParticipants(
        transactionTransfers,
        transactions[0].blockNumber,
        options.chain,
        options.configFile,
        options.mapSource
    )

    // Convert transactions and transfers to readable stream
    const pumlStream = transfers2PumlStream(
        transactions,
        transactionTransfers,
        participants,
        options.chain,
        options.hideFooter,
        options.hideBalances
    )

    // Pipe readable stream to PlantUML's Java process which then writes to a file
    await generateFile(pumlStream, options)
}

const getTransfersFromTrace = async (
    hashes: string[],
    transactions: TransactionDetails[],
    gethClient: GethClient
): Promise<Transfer[][]> => {
    // Get Ether and ERC20 transfers from custom EVM tx tracer
    // The values of the ERC20 transfers may not be correct.
    // Transactions -> Transfers
    const transactionTransfers: Transfer[][] = []
    for (const txHash of hashes) {
        transactionTransfers.push(await gethClient.getValueTransfers(txHash))
    }

    // For each tx, update the trace transfer value with the value from the tx receipt logs
    transactions.forEach((tx, i) => {
        // get ERC20 Transfer events from logs in the tx receipt
        const eventTransfers = EthereumNodeClient.parseTransferEvents(tx.logs)
        // Filter out any Ether transfers. Only want ERC20 transfers
        const traceTransfers = transactionTransfers[i].filter(
            t => t.tokenAddress
        )
        if (eventTransfers.length !== traceTransfers.length) {
            throw Error(
                `${eventTransfers.length} event transfers in tx ${tx.hash} does not match ${traceTransfers.length} trace transfers`
            )
        }
        traceTransfers.forEach((traceTransfer, i) => {
            // Update the trace transfer value with the event's Transfer value
            traceTransfer.from = eventTransfers[i].from
            traceTransfer.to = eventTransfers[i].to
            traceTransfer.value = eventTransfers[i].value
            traceTransfer.event = eventTransfers[i].event
            traceTransfer.type = eventTransfers[i].type
        })
    })

    // If the tx is transferring ETH then add as the first transfer
    transactions.forEach((tx, i) => {
        if (tx.value?.gt(0)) {
            transactionTransfers[i].unshift({
                from: getAddress(tx.from),
                to: getAddress(tx.to),
                value: tx.value,
                pc: 0,
                type: TransferType.Transfer,
            })
        }
    })

    return transactionTransfers
}

const getTransfersFromEvents = async (
    hashes: string[],
    transactions: TransactionDetails[]
): Promise<Transfer[][]> => {
    // Get Ether and ERC20 transfers from custom EVM tx tracer
    // The values of the ERC20 transfers may not be correct.
    // Transactions -> Transfers
    const transactionTransfers: Transfer[][] = []

    // For each tx, update the trace transfer value with the value from the tx receipt logs
    transactions.forEach((tx, i) => {
        // get ERC20 Transfer events from logs in the tx receipt
        transactionTransfers[i] = EthereumNodeClient.parseTransferEvents(
            tx.logs
        )
    })

    return transactionTransfers
}
