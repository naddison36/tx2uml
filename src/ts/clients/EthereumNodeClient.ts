import { Contract, providers } from "ethers"
import { Provider } from "@ethersproject/providers"
import { VError } from "verror"

import { TokenDetails, Trace, TransactionDetails } from "../transaction"
import { transactionHash } from "../utils/regEx"
import { TokenInfo } from "../types/TokenInfo"

require("axios-debug-log")

const tokenInfoAddress = "0xbA51331Bf89570F3f55BC26394fcCA05d4063C71"
const TokenInfoABI = [
    {
        inputs: [
            { internalType: "address[]", name: "tokens", type: "address[]" },
        ],
        name: "getInfoBatch",
        outputs: [
            {
                components: [
                    { internalType: "string", name: "symbol", type: "string" },
                    { internalType: "string", name: "name", type: "string" },
                ],
                internalType: "struct TokenInfo.Info[]",
                name: "infos",
                type: "tuple[]",
            },
        ],
        stateMutability: "view",
        type: "function",
    },
]

export default abstract class EthereumNodeClient {
    public readonly ethersProvider: Provider

    constructor(
        public readonly url: string = "http://localhost:8545",
        public readonly network = "mainnet"
    ) {
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
            const receiptPromise = this.ethersProvider.getTransactionReceipt(
                txHash
            )
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
        const results = await tokenInfo.getInfoBatch(contractAddresses)
        return results.map((result, i) => ({
            address: contractAddresses[i],
            ...result,
        }))
    }
}
