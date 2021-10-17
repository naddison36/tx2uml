import { Contract, ethers, providers } from "ethers"
import { Provider } from "@ethersproject/providers"
import { Log } from "@ethersproject/abstract-provider"
import { VError } from "verror"

import { TokenInfoABI, TransferEventsABI } from "./ABIs"
import {
    TokenDetails,
    Trace,
    TransactionDetails,
    Transfer,
} from "../transaction"
import { transactionHash } from "../utils/regEx"
import { TokenInfo } from "../types/TokenInfo"

require("axios-debug-log/enable")
const debug = require("debug")("tx2uml")

const tokenInfoAddress = "0xbA51331Bf89570F3f55BC26394fcCA05d4063C71"

export default abstract class EthereumNodeClient {
    public readonly ethersProvider: Provider

    constructor(
        public readonly url: string = "http://localhost:8545",
        public readonly chain = "mainnet"
    ) {
        const network = chain === "polygon" ? "matic" : chain
        this.ethersProvider = new providers.JsonRpcProvider(url, network)
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
            // get the transaction and receipt concurrently
            const txPromise = this.ethersProvider.getTransaction(txHash)
            const receiptPromise =
                this.ethersProvider.getTransactionReceipt(txHash)
            const [tx, receipt] = await Promise.all([txPromise, receiptPromise])

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
            throw new VError(
                err,
                `Failed to get transaction details for tx hash ${txHash} from url ${this.url}.`
            )
        }
    }

    async getTokenDetails(
        contractAddresses: string[]
    ): Promise<TokenDetails[]> {
        const tokenInfo = new Contract(
            tokenInfoAddress,
            TokenInfoABI,
            this.ethersProvider
        ) as TokenInfo
        try {
            const results = await tokenInfo.getInfoBatch(contractAddresses)
            debug(`Got token information for ${results.length} contracts`)
            return results.map((result, i) => ({
                address: contractAddresses[i],
                symbol: result.symbol,
                name: result.name,
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
        // parse eve
        const tokenEventInterface = new ethers.utils.Interface(
            TransferEventsABI
        )
        logs.forEach(log => {
            try {
                const event = tokenEventInterface.parseLog(log)
                if (event.name === "Transfer") {
                    transferEvents.push({
                        to: event.args.to,
                        from: event.args.from,
                        value: event.args.value,
                        tokenAddress: log.address,
                        ether: false,
                    })
                }
            } catch (err) {
                if (err.reason !== "no matching event")
                    throw new VError(err, "Failed to parse event log")
            }
        })

        return transferEvents
    }
}
