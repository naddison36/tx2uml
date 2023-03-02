import {
    TransactionDetails,
    Transfer,
    TransferPumlGenerationOptions,
    TransferType,
} from "./types/tx2umlTypes"
import { transactionHash } from "./utils/regEx"
import GethClient from "./clients/GethClient"
import EtherscanClient from "./clients/EtherscanClient"
import { transfers2PumlStream } from "./transfersPumlStreamer"
import { generateFile } from "./fileGenerator"
import EthereumNodeClient from "./clients/EthereumNodeClient"
import { TransactionManager } from "./transaction"

export const generateValueDiagram = async (
    hashes: string,
    options: TransferPumlGenerationOptions
) => {
    // Initiate Geth client
    if (["openeth", "nether", "besu"].includes(options.nodeType)) {
        throw Error(
            `Value transfers diagrams are not supports for the ${options.nodeType} client which does not support the debug.traceTransaction API`
        )
    }
    const gethClient = new GethClient(options.url)

    // Initiate Etherscan client
    const etherscanClient = new EtherscanClient(
        options.etherscanKey,
        options.chain
    )
    const txManager = new TransactionManager(gethClient, etherscanClient)

    // Get transactions
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

    // Get Ether and ERC20 transfers from custom EVM tx tracer
    // The values of the ERC20 transfers may not be correct.
    // Transactions -> Transfers
    const transfers: Transfer[][] = []
    if (hashes?.match(transactionHash)) {
        transfers.push(await gethClient.getValueTransfers(hashes))
    } else {
        try {
            const txHashes = hashes?.split(",")
            for (const txHash of txHashes) {
                transfers.push(await gethClient.getValueTransfers(txHash))
            }
        } catch (err) {
            console.error(
                `Must pass a transaction hash or an array of hashes in hexadecimal format with a 0x prefix`
            )
            process.exit(4)
        }
    }

    // For each tx, update the trace transfer value with the value from the tx receipt logs
    transactions.forEach((tx, i) => {
        // get ERC20 Transfer events from logs in the tx receipt
        const eventTransfers = EthereumNodeClient.parseTransferEvents(tx.logs)
        // Filter out any Ether transfers. Only want ERC20 transfers
        const traceTransfers = transfers[i].filter(t => t.tokenAddress)
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
            transfers[i].unshift({
                from: tx.from,
                to: tx.to,
                value: tx.value,
                pc: 0,
                type: TransferType.Transfer,
            })
        }
    })

    // Get all the participating contracts from the transfers
    const participants = await txManager.getTransferParticipants(
        transfers,
        transactions[0].blockNumber,
        options.configFile
    )

    // Convert transactions and transfers to readable stream
    const pumlStream = transfers2PumlStream(
        transactions,
        transfers,
        participants
    )

    // Pipe readable stream to PlantUML's Java process which then writes to a file
    let filename = options.outputFileName
    if (!filename) {
        filename = hashes?.match(transactionHash) ? hashes : "output"
    }
    await generateFile(pumlStream, {
        format: options.outputFormat,
        filename,
    })
}
