import { BigNumber, Contract, providers } from "ethers"
import { Provider } from "@ethersproject/providers"

import { TokenInfoABI } from "./ABIs"
import {
    Network,
    TokenDetails,
    Trace,
    TransactionDetails,
    Transfer,
} from "../transaction"
import { transactionHash } from "../utils/regEx"
import { TokenInfo } from "../types/TokenInfo"
import { Log } from "@ethersproject/abstract-provider"
import { getAddress, hexDataSlice } from "ethers/lib/utils"

require("axios-debug-log")
const debug = require("debug")("tx2uml")

const tokenInfoAddresses: { [network: string]: string } = {
    mainnet: "0x190c8CB4BA6444390266CA30bDEAe4583041B14e",
    polygon: "0x2aA8dba5bd50Dc469B50b5687b75c6212DeF3E1A",
}

export default abstract class EthereumNodeClient {
    public readonly ethersProvider: Provider
    private tokenInfoAddress: string

    constructor(
        public readonly url: string = "http://localhost:8545",
        public readonly network: Network = "mainnet"
    ) {
        this.ethersProvider = new providers.JsonRpcProvider(url)
        if (!tokenInfoAddresses[network])
            throw Error(
                `Can not get token info from ${network} as TokenInfo contract has not been deployed`
            )
        this.tokenInfoAddress = tokenInfoAddresses[network]
    }

    abstract getTransactionTrace(txHash: string): Promise<Trace[]>
    abstract getTransactionError(tx: TransactionDetails): Promise<string>

    async getTransactionDetails(txHash: string): Promise<TransactionDetails> {
        if (!txHash?.match(transactionHash)) {
            throw new TypeError(
                `Transaction hash "${txHash}" must be 32 bytes in hexadecimal format with a 0x prefix`
            )
        }

        try {
            debug(
                `About to get tx details and receipt from chain for ${txHash}`
            )
            // get the transaction and receipt concurrently
            const txPromise = this.ethersProvider.getTransaction(txHash)
            const receiptPromise =
                this.ethersProvider.getTransactionReceipt(txHash)
            const [tx, receipt] = await Promise.all([txPromise, receiptPromise])

            if (!receipt)
                throw Error(
                    `Failed to get transaction details and receipt for ${txHash} from ${this.url}`
                )

            debug(`Got tx details and receipt for ${txHash}`)

            const block = await this.ethersProvider.getBlock(
                receipt.blockNumber
            )
            const txDetails: TransactionDetails = {
                hash: tx.hash,
                from: tx.from,
                to: tx.to,
                data: tx.data,
                nonce: tx.nonce,
                index: receipt.transactionIndex,
                value: tx.value,
                gasLimit: tx.gasLimit,
                gasPrice: tx.gasPrice,
                maxPriorityFeePerGas: tx.maxPriorityFeePerGas,
                maxFeePerGas: tx.maxFeePerGas,
                gasUsed: receipt.gasUsed,
                timestamp: new Date(block.timestamp * 1000),
                status: receipt.status === 1,
                logs: receipt.logs,
                blockNumber: receipt.blockNumber,
            }
            // If the transaction failed, get the revert reason
            if (receipt.status === 0) {
                txDetails.error = await this.getTransactionError(txDetails)
            }

            return txDetails
        } catch (err) {
            throw new Error(
                `Failed to get transaction details for tx hash ${txHash} from url ${this.url}.`,
                { cause: err }
            )
        }
    }

    async getTokenDetails(
        contractAddresses: string[]
    ): Promise<TokenDetails[]> {
        const tokenInfo = new Contract(
            this.tokenInfoAddress,
            TokenInfoABI,
            this.ethersProvider
        ) as TokenInfo
        try {
            const results = await tokenInfo.getInfoBatch(contractAddresses)
            debug(`Got token information for ${results.length} contracts`)
            return results.map((result, i) => ({
                address: contractAddresses[i],
                noContract: result.noContract,
                symbol: result.symbol,
                name: result.name,
                decimals: result.decimals.toNumber(),
            }))
        } catch (err) {
            console.error(
                `Failed to get token information for contracts: ${contractAddresses}.\nerror: ${err.message}`
            )
            return []
        }
    }

    // Parse Transfer events from a transaction receipt
    static parseTransferEvents(logs: Array<Log>): Transfer[] {
        const transferEvents: Transfer[] = []
        logs.forEach((log, i) => {
            try {
                // Only try and parse Transfer events with the first two params indexed
                if (
                    log.topics[0] !==
                        "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef" ||
                    log.topics.length < 3
                )
                    return

                if (log.topics.length === 3) {
                    transferEvents.push({
                        from: getAddress(hexDataSlice(log.topics[1], 12)),
                        to: getAddress(hexDataSlice(log.topics[2], 12)),
                        value: BigNumber.from(log.data),
                        tokenAddress: log.address,
                        pc: 0,
                    })
                } else {
                    transferEvents.push({
                        from: getAddress(hexDataSlice(log.topics[1], 12)),
                        to: getAddress(hexDataSlice(log.topics[2], 12)),
                        tokenId: BigNumber.from(log.topics[3]).toNumber(),
                        tokenAddress: log.address,
                        pc: 0,
                    })
                }
            } catch (err) {
                if (err.reason !== "no matching event")
                    throw new Error(`Failed to parse the event log ${i}`, {
                        cause: err,
                    })
            }
        })

        return transferEvents
    }
}
