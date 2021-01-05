import { Contract as EthersContract, providers } from "ethers"
import { Contract, ContractCall, Provider } from "ethers-multicall"
import { VError } from "verror"

import { TokenDetails, TransactionDetails } from "../transaction"
import { transactionHash } from "../utils/regEx"
import { JsonFragment } from "@ethersproject/abi"
import { convertBytes32ToString } from "../utils/formatters"

require("axios-debug-log")
const debug = require("debug")("tx2uml")

const stringTokenABI: JsonFragment[] = [
    {
        constant: true,
        inputs: [],
        name: "symbol",
        outputs: [
            {
                name: "",
                type: "string",
            },
        ],
        payable: false,
        stateMutability: "view",
        type: "function",
    },
    {
        constant: true,
        inputs: [],
        name: "name",
        outputs: [
            {
                name: "",
                type: "string",
            },
        ],
        payable: false,
        stateMutability: "view",
        type: "function",
    },
]
// Deep copy string output ABI and change to bytes32 ABI
const bytes32TokenABI = JSON.parse(JSON.stringify(stringTokenABI))
bytes32TokenABI[0].outputs[0].type = "bytes32"
bytes32TokenABI[1].outputs[0].type = "bytes32"

export default class EthereumNodeClient {
    public readonly ethersProvider
    public readonly multicallProvider: Provider

    constructor(
        public readonly url: string = "http://localhost:8545",
        public readonly network = "mainnet"
    ) {
        this.ethersProvider = new providers.JsonRpcProvider(url, network)
        this.multicallProvider = new Provider(this.ethersProvider, 1)
    }

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

            return {
                hash: tx.hash,
                from: tx.from,
                to: tx.to,
                nonce: tx.nonce,
                index: receipt.transactionIndex,
                value: tx.value,
                gasLimit: tx.gasLimit,
                gasPrice: tx.gasPrice,
                gasUsed: receipt.gasUsed,
                timestamp: new Date(block.timestamp * 1000),
                status: receipt.status === 1,
            }
        } catch (err) {
            throw new VError(
                err,
                `Failed to get transaction details for tx hash ${txHash} from url ${this.url}.`
            )
        }
    }

    async getTokenDetailsKnownABI(
        contract: EthersContract
    ): Promise<TokenDetails> {
        const callPromises: ContractCall[] = []
        const multicallContract = new Contract(
            contract.address,
            contract.interface.fragments
        )
        callPromises.push(multicallContract.symbol())
        callPromises.push(multicallContract.name())
        const [symbolRaw, nameRaw] = await this.multicallProvider.all(
            callPromises
        )
        const symbol = convertBytes32ToString(symbolRaw)
        const name = convertBytes32ToString(nameRaw)
        debug(`Got token details ${name} (${symbol}) for ${contract.address}`)
        return {
            address: contract.address,
            symbol,
            name,
        }
    }

    // Attempts to get the `symbol` and `name` properties from a contract even if the ABI is unknown or
    // the `symbol` and `name` properties are not on the contract's ABI.
    // This is to get the token details from proxy contracts or contracts that are not verified on Etherscan
    async getTokenDetailsUnknownABI(address: string): Promise<TokenDetails> {
        const tokenDetails = await this._getTokenDetails(
            address,
            stringTokenABI
        )
        if (tokenDetails.symbol?.length > 0 && tokenDetails.name?.length > 0) {
            return tokenDetails
        }
        return await this._getTokenDetails(address, bytes32TokenABI)
    }

    private async _getTokenDetails(
        address: string,
        tokenABI: JsonFragment[]
    ): Promise<TokenDetails> {
        try {
            const callPromises: ContractCall[] = []
            const stringABIContract = new Contract(address, tokenABI)
            callPromises.push(stringABIContract.symbol())
            callPromises.push(stringABIContract.name())
            const [symbolRaw, nameRaw] = await this.multicallProvider.all(
                callPromises
            )
            const symbol = convertBytes32ToString(symbolRaw)
            const name = convertBytes32ToString(nameRaw)
            debug(
                `Got token details ${name} (${symbol}) using ${tokenABI[0].outputs[0].type} ABI from ${address}`
            )
            return {
                address,
                symbol,
                name,
            }
        } catch (err) {
            debug(
                `Failed to get token details using ${tokenABI[0].outputs[0].type} ABI from ${address}`
            )
            return {
                address,
            }
        }
    }
}
