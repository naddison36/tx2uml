import axios from "axios"
import { BigNumber, Contract as EthersContract, providers } from "ethers"
import { Contract, ContractCall, Provider } from "ethers-multicall"
import { VError } from "verror"

import {
    MessageType,
    TokenDetails,
    Trace,
    TransactionDetails,
} from "./transaction"
import { bytes, transactionHash } from "./utils/regEx"
import { parseBytes32String } from "ethers/lib/utils"
import { JsonFragment } from "@ethersproject/abi"

require("axios-debug-log")
const debug = require("debug")("tx2uml")

export type TraceResponse = {
    type: "call" | "suicide" | "create"
    action: {
        callType?: "call" | "delegatecall" | "staticcall"
        from?: string
        to?: string
        input?: string
        gas?: string
        value?: string
        // used with create contract calls
        creationMethod?: "create"
        init?: string
        // uesd with selfdestruct calls
        address?: string
        balance?: string
        refundAddress?: string
    }
    result?: {
        gasUsed: string
        output: string
        // used with create contract calls
        address?: string
        code?: string
        init?: string
    } | null
    subtraces: number
    traceAddress: number[]
    error?: string
}

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

export default class OpenEthereumClient {
    public readonly ethersProvider
    public readonly multicallProvider: Provider

    private jsonRpcId = 0

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
        const symbol = convertOutput2String(symbolRaw)
        const name = convertOutput2String(nameRaw)
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
            const symbol = convertOutput2String(symbolRaw)
            const name = convertOutput2String(nameRaw)
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

    async getTransactionTrace(txHash: string): Promise<Trace[]> {
        if (!txHash?.match(transactionHash)) {
            throw new TypeError(
                `Transaction hash "${txHash}" must be 32 bytes in hexadecimal format with a 0x prefix`
            )
        }

        try {
            debug(`About to get transaction trace for ${txHash}`)
            const response = await axios.post(this.url, {
                id: this.jsonRpcId++,
                jsonrpc: "2.0",
                method: "trace_replayTransaction",
                params: [txHash, ["trace"]],
            })

            if (response.data?.error?.message) {
                throw new Error(response.data.error.message)
            }
            if (!response?.data?.result?.trace) {
                throw new Error(
                    `no transaction trace messages in response: ${response?.data}`
                )
            }
            const traceResponses: TraceResponse[] = response.data.result.trace

            const parentTraces: Trace[] = []
            const traces: Trace[] = []
            let id = 0
            for (const trace of traceResponses) {
                const traceDepth = trace.traceAddress.length
                const parentTrace =
                    traceDepth > 0 ? parentTraces[traceDepth - 1] : undefined
                const type = convertType(trace)
                const from =
                    type === MessageType.Selfdestruct
                        ? trace.action?.address
                        : trace.action?.from
                const delegatedFrom =
                    parentTrace?.type === MessageType.DelegateCall
                        ? parentTrace.to
                        : from
                const to = (() => {
                    switch (type) {
                        case MessageType.Create:
                            return trace.result?.address
                        case MessageType.Selfdestruct:
                            return trace.action?.address
                        default:
                            return trace.action?.to
                    }
                })()
                const newTrace: Trace = {
                    id: id++,
                    type,
                    from,
                    delegatedFrom,
                    to,
                    value: trace.action?.value
                        ? convertBigNumber(trace.action?.value)
                        : BigNumber.from(0),
                    inputs: trace.action.input,
                    inputParams: [], // Will init later once we have the contract ABI
                    funcSelector:
                        trace.action.input?.length >= 10
                            ? trace.action.input.slice(0, 10)
                            : undefined,
                    outputs: trace.result?.output,
                    outputParams: [], // Will init later once we have the contract ABI
                    gasLimit: convertBigNumber(trace?.action.gas),
                    gasUsed: convertBigNumber(trace.result?.gasUsed),
                    parentTrace,
                    childTraces: [],
                    constructorParams: trace.action.init,
                    address: trace.result?.address || trace.action.address,
                    balance: convertBigNumber(trace.action.balance),
                    refundAddress: trace.action.refundAddress,
                    error: trace.error,
                }
                if (parentTrace) {
                    parentTrace.childTraces.push(newTrace)
                }
                // update the latest parent trace for this trace depth
                if (!parentTraces[traceDepth]) {
                    parentTraces.push(newTrace)
                } else {
                    parentTraces[traceDepth] = newTrace
                }
                traces.push(newTrace)
            }

            debug(
                `Got ${traces.length} traces actions for tx hash ${txHash} from ${this.url}`
            )

            return traces
        } catch (err) {
            throw new VError(
                err,
                `Failed to get transaction trace for tx hash ${txHash} from url ${this.url}.`
            )
        }
    }
}

const convertOutput2String = (output: string) => {
    if (!output || typeof output !== "string") return undefined
    return output.match(bytes) ? parseBytes32String(output) : output
}

const convertType = (trace: TraceResponse): MessageType => {
    let type: MessageType = MessageType.Call
    if (trace.action.callType === "delegatecall") {
        return MessageType.DelegateCall
    }
    if (trace.action.callType === "staticcall") {
        return MessageType.StaticCall
    }
    if (trace.type === "create") {
        return MessageType.Create
    } else if (trace.type === "suicide") {
        return MessageType.Selfdestruct
    }
    return type
}

// convert an integer value to a decimal value. eg wei to Ethers which is to 18 decimal places
const convertBigNumber = (value: string): BigNumber | undefined => {
    if (!value) return undefined
    return BigNumber.from(value)
}
