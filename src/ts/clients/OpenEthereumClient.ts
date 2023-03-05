import axios from "axios"
import { BigNumber } from "ethers"

import { MessageType, Network, Trace, TransactionDetails } from "../types/tx2umlTypes"
import { transactionHash } from "../utils/regEx"
import { hexlify } from "ethers/lib/utils"
import EthereumNodeClient from "./EthereumNodeClient"

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
        // used with selfdestruct calls
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

export default class OpenEthereumClient extends EthereumNodeClient {
    private jsonRpcId = 0

    constructor(
        public readonly url: string = "http://localhost:8545",
        public readonly network: Network = "mainnet"
    ) {
        super(url, network)
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
                method: "trace_transaction",
                params: [txHash],
            })

            if (response.data?.error?.message) {
                throw new Error(response.data.error.message)
            }
            if (!(response?.data?.result?.length > 0)) {
                throw new Error(
                    `no transaction trace messages in response: ${response?.data}`
                )
            }
            const traceResponses: TraceResponse[] = response.data.result

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
                            return trace.action?.refundAddress
                        default:
                            return trace.action?.to
                    }
                })()
                const inputs =
                    type === MessageType.Create
                        ? trace.action?.init
                        : trace.action?.input
                const outputs =
                    type === MessageType.Create
                        ? trace.result?.code
                        : trace.result?.output
                const newTrace: Trace = {
                    id: id++,
                    type,
                    from,
                    delegatedFrom,
                    to,
                    value: trace.action?.value
                        ? convertBigNumber(trace.action?.value)
                        : BigNumber.from(0),
                    inputs,
                    inputParams: [], // Will init later once we have the contract ABI
                    funcSelector:
                        trace.action.input?.length >= 10
                            ? trace.action.input.slice(0, 10)
                            : undefined,
                    outputs,
                    outputParams: [], // Will init later once we have the contract ABI
                    gasLimit: convertBigNumber(trace?.action.gas),
                    gasUsed: convertBigNumber(trace.result?.gasUsed),
                    parentTrace,
                    childTraces: [],
                    depth: traceDepth,
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
            const error = new Error(
                `Failed to get transaction trace for tx hash ${txHash} from url ${this.url}.`,
                { cause: err }
            )
            throw error
        }
    }

    async getTransactionError(tx: TransactionDetails): Promise<string> {
        if (!tx?.hash.match(transactionHash)) {
            throw TypeError(
                `There is no transaction hash on the receipt object`
            )
        }
        if (tx.status) {
            return undefined
        }
        if (tx.gasUsed === tx.gasLimit) {
            throw Error("Transaction failed as it ran out of gas.")
        }

        try {
            debug(`About to get transaction trace for ${tx.hash}`)
            const params = [
                {
                    // A Nethermind bug means the nonce of the original transaction can be used.
                    // error.data: "wrong transaction nonce"
                    // nonce: tx.nonce,
                    gasPrice: tx.gasPrice.toHexString(),
                    gas: tx.gasLimit.toHexString(),
                    value: tx.value.toHexString(),
                    from: tx.from,
                    to: tx.to,
                    data: tx.data,
                },
                hexlify(tx.blockNumber),
            ]
            const response = await axios.post(this.url, {
                id: this.jsonRpcId++,
                jsonrpc: "2.0",
                method: "eth_call",
                params,
            })

            return response.data?.error?.data
        } catch (err) {
            throw new Error(
                `Failed to get transaction trace for tx hash ${tx.hash} from url ${this.url}.`,
                { cause: err }
            )
        }
    }
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
