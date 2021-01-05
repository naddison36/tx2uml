import { BigNumber, Contract as EthersContract } from "ethers"
import { defaultAbiCoder, TransactionDescription } from "@ethersproject/abi"
import { FunctionFragment } from "ethers/lib/utils"
import VError from "verror"

import { transactionHash } from "./utils/regEx"
import EtherscanClient from "./clients/EtherscanClient"
import pLimit from "p-limit"
import EthereumNodeClient from "./clients/EthereumNodeClient"
import { ITracingClient } from "./clients"

const debug = require("debug")("tx2uml")

export enum MessageType {
    Unknown,
    Call,
    Create,
    Selfdestruct,
    DelegateCall,
    StaticCall,
}

export type Param = {
    name: string
    type: string
    value?: string
    components?: Param[]
}

export type Trace = {
    id: number
    type: MessageType
    from: string
    // For child traces of delegate calls. delegatedFrom = the parent delegate call's to address
    delegatedFrom: string
    to: string
    value: BigNumber
    funcSelector?: string
    funcName?: string
    inputs?: string
    inputParams?: Param[]
    outputs?: string
    outputParams?: Param[]
    proxy?: boolean
    gasLimit: BigNumber
    gasUsed: BigNumber
    parentTrace?: Trace
    childTraces: Trace[]
    error?: string
}

export type Contract = {
    address: string
    contractName?: string
    appName?: string
    balance?: number
    tokenName?: string
    symbol?: string
    decimals?: number
    proxyImplementation?: string
    ethersContract?: EthersContract
}

export type TokenDetails = {
    address: string
    name?: string
    symbol?: string
    decimals?: number
}

export type Contracts = { [address: string]: Contract }

export type Token = {
    address: string
    name: string
    symbol: string
    decimals?: number
    totalSupply?: BigNumber
}

export interface TransactionDetails {
    hash: string
    from: string
    to: string
    nonce: number
    index: number
    value: BigNumber
    gasPrice: BigNumber
    gasLimit: BigNumber
    gasUsed: BigNumber
    timestamp: Date
    status: boolean
}

type ParamTypeInternal = {
    name: string
    type: string
    baseType: string
    components?: ParamTypeInternal[]
}

export type Networks = "mainnet" | "ropsten" | "rinkeby" | "kovan"

export class TransactionManager {
    constructor(
        public readonly tracingClient: ITracingClient,
        public readonly etherscanClient: EtherscanClient,
        public readonly ethereumNodeClient: EthereumNodeClient,
        // 3 works for smaller contracts but Etherscan will rate limit on larger contracts when set to 3
        public apiConcurrencyLimit = 2
    ) {}

    async getTransactions(
        txHashes: string | string[]
    ): Promise<TransactionDetails[]> {
        const transactions: TransactionDetails[] = []
        for (const txHash of txHashes) {
            if (!txHash?.match(transactionHash)) {
                console.error(
                    `Array of transaction hashes must be in hexadecimal format with a 0x prefix`
                )
                process.exit(1)
            }
            transactions.push(await this.getTransaction(txHash))
        }

        return transactions
    }

    async getTransaction(txHash: string): Promise<TransactionDetails> {
        return await this.ethereumNodeClient.getTransactionDetails(txHash)
    }

    async getTraces(transactions: TransactionDetails[]): Promise<Trace[][]> {
        const transactionsTraces: Trace[][] = []
        for (const transaction of transactions) {
            transactionsTraces.push(
                await this.tracingClient.getTransactionTrace(transaction.hash)
            )
        }
        return transactionsTraces
    }

    async getContracts(transactionsTraces: Trace[][]): Promise<Contracts> {
        const flatTraces = transactionsTraces.flat()
        const participantAddresses: string[] = []
        for (const trace of Object.values(flatTraces)) {
            // duplicates are ok. They will be filtered later
            participantAddresses.push(trace.from)
            participantAddresses.push(trace.to)
        }

        // get contract ABIs from Etherscan
        let contracts = await this.getContractsFromAddresses(
            participantAddresses
        )
        // identify proxy contracts from chain
        // contracts = await setProxyContracts(contracts, url)
        // Get token name and symbol from chain
        return await this.setTokenAttributes(contracts)
    }

    // Get the contract names and ABIs from Etherscan
    async getContractsFromAddresses(addresses: string[]): Promise<Contracts> {
        const contracts: Contracts = {}
        // Convert to a Set to remove duplicates and then back to an array
        const uniqueAddresses = Array.from(new Set(addresses))
        debug(`${uniqueAddresses.length} contracts in the transactions`)

        // Get the contract details in parallel with a concurrency limit
        const limit = pLimit(this.apiConcurrencyLimit)
        const getContractPromises = uniqueAddresses.map(address => {
            return limit(() => this.etherscanClient.getContract(address))
        })
        const results: Contract[] = await Promise.all(getContractPromises)

        results.forEach(result => {
            contracts[result.address] = result
        })

        return contracts
    }

    async setTokenAttributes(contracts: Contracts): Promise<Contracts> {
        // get the token details in parallel
        const tokensDetailsPromises = Object.values(contracts).map(contract => {
            if (
                contract.ethersContract?.interface?.functions["symbol()"] &&
                contract.ethersContract?.interface?.functions["name()"]
            ) {
                return this.ethereumNodeClient.getTokenDetailsKnownABI(
                    contract.ethersContract
                )
            }
            return this.ethereumNodeClient.getTokenDetailsUnknownABI(
                contract.address
            )
        })
        const tokensDetails = await Promise.all(tokensDetailsPromises)

        tokensDetails.forEach(tokenDetails => {
            contracts[tokenDetails.address].tokenName = tokenDetails.name
            contracts[tokenDetails.address].symbol = tokenDetails.symbol
        })
        return contracts
    }

    static parseTraceParams(traces: Trace[][], contracts: Contracts) {
        const functionSelector2Contract = mapFunctionSelectors2Contracts(
            contracts
        )
        for (const trace of traces.flat()) {
            if (trace.inputs?.length >= 10) {
                let contracts = functionSelector2Contract[trace.funcSelector]
                if (contracts?.length > 0) {
                    // get the contract for the function selector that matches the to address
                    let contract = contracts.find(
                        contract => contract.address === trace.to
                    )
                    // if the function is not on the `to` contract, then its a proxy contract
                    // so just use any contract if the function is on another contract
                    if (!contract) {
                        contract = contracts[0]
                        trace.proxy = true
                    }
                    try {
                        const txDescription = contract.interface.parseTransaction(
                            {
                                data: trace.inputs,
                            }
                        )
                        trace.funcName = txDescription.name
                        addInputParamsToTrace(trace, txDescription)
                        addOutputParamsToTrace(trace, txDescription)
                    } catch (err) {
                        if (!err.message.match("no matching function")) {
                            throw new VError(
                                err,
                                `Failed to parse trace with id ${trace.id} selector ${trace.funcSelector}`
                            )
                        }
                    }
                }
            }
        }
    }
}

// map of function selectors to Ethers Contracts
const mapFunctionSelectors2Contracts = (
    contracts: Contracts
): {
    [functionSelector: string]: EthersContract[]
} => {
    // map of function selectors to Ethers Contracts
    const functionSelector2Contract: {
        [functionSelector: string]: EthersContract[]
    } = {}
    // For each contract, get function selectors
    Object.values(contracts).forEach(contract => {
        if (contract.ethersContract) {
            Object.values(contract.ethersContract.interface.fragments)
                .filter(fragment => fragment.type === "function")
                .forEach((fragment: FunctionFragment) => {
                    const sighash = contract.ethersContract.interface.getSighash(
                        fragment
                    )
                    if (!functionSelector2Contract[sighash]) {
                        functionSelector2Contract[sighash] = []
                    }
                    functionSelector2Contract[sighash].push(
                        contract.ethersContract
                    )
                })
        }
    })

    return functionSelector2Contract
}

const addInputParamsToTrace = (
    trace: Trace,
    txDescription: TransactionDescription
) => {
    // For each function argument, add to the trace input params
    txDescription.args.forEach((arg, i) => {
        const functionFragment = txDescription.functionFragment.inputs[i]

        const components = addValuesToComponents(functionFragment, arg)

        trace.inputParams.push({
            name: functionFragment.name,
            type: functionFragment.type,
            value: arg,
            components,
        })
    })
}

const addOutputParamsToTrace = (
    trace: Trace,
    txDescription: TransactionDescription
): void => {
    // Undefined outputs can happen with failed transactions
    if (!trace.outputs || trace.outputs === "0x" || trace.error) return

    const functionFragments = txDescription.functionFragment.outputs
    const outputParams = defaultAbiCoder.decode(
        functionFragments,
        trace.outputs
    )
    // For each output, add to the trace output params
    outputParams.forEach((output, i) => {
        const components = addValuesToComponents(functionFragments[i], output)

        trace.outputParams.push({
            name: functionFragments[i].name,
            type: functionFragments[i].type,
            value: output,
            components,
        })
    })
    debug(
        `Decoded ${trace.outputParams.length} output params for ${trace.funcName} with selector ${trace.funcSelector}`
    )
}

// if function components exists, recursively add arg values to the function components
const addValuesToComponents = (
    paramType: ParamTypeInternal,
    args: any
): Param[] => {
    if (paramType.baseType !== "array") {
        if (!paramType?.components) {
            return undefined
        }
        // For each component
        return paramType.components.map((component, j) => {
            // add the value and recursively add the components
            return {
                name: component.name,
                type: component.type,
                value: args[j],
                components: addValuesToComponents(component, args[j]),
            }
        })
    } else {
        // If an array of components
        return args.map((row: any, r: number) => {
            // Remove the last two [] characters from the type.
            // For example, tuple[] becomes tuple and tuple[][] becomes tuple[]
            const childType = paramType.type.slice(0, -2)
            // If a multi dimensional array then the baseType is still an array. Otherwise it becomes a tuple
            const childBaseType =
                childType.slice(-2) === "[]" ? "array" : childType
            const components = addValuesToComponents(
                { ...paramType, type: childType, baseType: childBaseType },
                row
            )
            return {
                name: r.toString(),
                type: childType,
                value: row,
                components,
            }
        })
    }
}
