import { BigNumber, Contract as EthersContract } from "ethers"
import { defaultAbiCoder, TransactionDescription } from "@ethersproject/abi"
import { Log } from "@ethersproject/abstract-provider"
import { FunctionFragment, LogDescription } from "ethers/lib/utils"
import pLimit from "p-limit"
import VError from "verror"

import { transactionHash } from "./utils/regEx"
import EtherscanClient from "./clients/EtherscanClient"
import EthereumNodeClient from "./clients/EthereumNodeClient"

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
    parsedConstructorParams?: boolean
    outputs?: string
    outputParams?: Param[]
    proxy?: boolean
    gasLimit: BigNumber
    gasUsed: BigNumber
    parentTrace?: Trace
    childTraces: Trace[]
    depth: number
    error?: string
}

export type Event = {
    name: string
    params: Param[]
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
    constructorInputs?: string
    events?: Event[]
    minDepth?: number
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

export type Transfer = {
    from: string
    to: string
    value: BigNumber
    ether: boolean
    tokenAddress?: string
    tokenSymbol?: string
    tokenName?: string
    decimals?: number
}

export interface TransactionDetails {
    hash: string
    from: string
    to: string
    data: string
    nonce: number
    index: number
    value: BigNumber
    gasPrice: BigNumber
    gasLimit: BigNumber
    gasUsed: BigNumber
    timestamp: Date
    status: boolean
    blockNumber: number
    logs: Array<Log>
    error?: string
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
        public readonly ethereumNodeClient: EthereumNodeClient,
        public readonly etherscanClient: EtherscanClient,
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
        return this.ethereumNodeClient.getTransactionDetails(txHash)
    }

    async getTraces(transactions: TransactionDetails[]): Promise<Trace[][]> {
        const transactionsTraces: Trace[][] = []
        for (const transaction of transactions) {
            transactionsTraces.push(
                await this.ethereumNodeClient.getTransactionTrace(
                    transaction.hash
                )
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
        const contracts = await this.getContractsFromAddresses(
            participantAddresses
        )
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
        // get the token details
        const contractAddresses = Object.keys(contracts)
        const tokensDetails = await this.ethereumNodeClient.getTokenDetails(
            contractAddresses
        )

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
                if (trace.type === MessageType.Create) {
                    trace.funcName = "constructor"
                    addConstructorParamsToTrace(trace, contracts)
                    return
                }
                const selectedContracts =
                    functionSelector2Contract[trace.funcSelector]
                if (selectedContracts?.length > 0) {
                    // get the contract for the function selector that matches the to address
                    let contract = selectedContracts.find(
                        contract => contract.address === trace.to
                    )
                    // if the function is not on the `to` contract, then its a proxy contract
                    // so just use any contract if the function is on another contract
                    if (!contract) {
                        contract = selectedContracts[0]
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
                            const error = new VError(
                                err,
                                `Failed to parse selector ${trace.funcSelector} in trace with id ${trace.id} from ${trace.from} to ${trace.to}`
                            )
                            console.warn(error)
                        }
                    }
                }
            }
        }
    }

    static parseTransactionLogs(logs: Array<Log>, contracts: Contracts) {
        // for each tx log
        for (const log of logs) {
            // see if we have the contract source for the log
            const contract = contracts[log.address.toLowerCase()]
            if (contract?.ethersContract) {
                // try and parse the log topic
                try {
                    const event = contract.ethersContract.interface.parseLog(
                        log
                    )
                    contract.events.push(parseEvent(contract, event))
                } catch (err) {
                    debug(
                        `Failed to parse log with topic ${log?.topics[0]} on contract ${log.address}`
                    )
                }
            }
        }
    }

    // Marks each contract the minimum call depth it is used in
    static parseTraceDepths(traces: Trace[][], contracts: Contracts) {
        const flatTraces = traces.flat()
        contracts[flatTraces[0].from].minDepth = 0
        for (const trace of flatTraces) {
            if (
                contracts[trace.to].minDepth == undefined ||
                trace.depth < contracts[trace.to].minDepth
            ) {
                contracts[trace.to].minDepth = trace.depth
            }
        }
    }

    // Filter out delegated calls from proxies to their implementations.
    static filterTransactionTraces(
        transactionTraces: Trace[][],
        contracts: Contracts,
        options: { noDelegates?: boolean }
    ): [Trace[][], Contracts] {
        // If proxies and libraries are to be included then don't filter the traces
        if (!options.noDelegates) return [transactionTraces, contracts]

        const filteredTransactionTraces = transactionTraces.map(t => [])
        let usedAddresses = new Set<string>()

        // For each transaction
        transactionTraces.forEach((tx, i) => {
            // recursively get a tree of traces without delegated calls from proxies
            const filteredTraces = filterOutDelegatedTraces(tx[0])
            filteredTransactionTraces[i] = arrayifyTraces(filteredTraces[0])

            // Add the tx sender to set of used addresses
            usedAddresses.add(filteredTransactionTraces[i][0].from)
            // Add all the to addresses of all the trades to the set of used addresses
            filteredTransactionTraces[i].forEach(t => usedAddresses.add(t.to))
        })

        // Filter out contracts that are no longer used from filtered out traces
        const usedContracts: Contracts = {}
        Array.from(usedAddresses).forEach(
            address => (usedContracts[address] = contracts[address])
        )

        return [filteredTransactionTraces, usedContracts]
    }
}

// Recursively filter out delegate calls from proxies or libraries depending on options
const filterOutDelegatedTraces = (
    trace: Trace,
    lastValidParentTrace?: Trace // there can be multiple traces removed
): Trace[] => {
    // If parent trace was a proxy
    const removeTrace = trace.type === MessageType.DelegateCall

    const parentTrace = removeTrace
        ? lastValidParentTrace // set to the last parent not removed
        : trace.parentTrace // parent is not a proxy so is included

    // filter the child traces
    let filteredChildren: Trace[] = []
    trace.childTraces.forEach(child => {
        filteredChildren = filteredChildren.concat(
            filterOutDelegatedTraces(child, parentTrace)
        )
    })
    // if trace is being removed, return child traces so this trace is removed
    if (removeTrace) {
        return filteredChildren
    }
    // else, attach child traces to copied trace and return in array
    return [
        {
            ...trace,
            proxy: false,
            childTraces: filteredChildren,
            parentTrace: lastValidParentTrace,
            delegatedFrom: trace.from,
            type: removeTrace ? MessageType.Call : trace.type,
        },
    ]
}

const arrayifyTraces = (trace: Trace): Trace[] => {
    let traces = [trace]
    trace.childTraces.forEach(child => {
        const arrayifiedChildren = arrayifyTraces(child)
        traces = traces.concat(arrayifiedChildren)
    })
    return traces
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
    outputParams.forEach((param, i) => {
        const components = addValuesToComponents(functionFragments[i], param)

        trace.outputParams.push({
            name: functionFragments[i].name,
            type: functionFragments[i].type,
            value: param,
            components,
        })
    })
    debug(
        `Decoded ${trace.outputParams.length} output params for ${trace.funcName} with selector ${trace.funcSelector}`
    )
}

const addConstructorParamsToTrace = (trace: Trace, contracts: Contracts) => {
    // Do we have the ABI for the deployed contract?
    const constructor = contracts[trace.to]?.ethersContract?.interface?.deploy
    if (!constructor?.inputs) {
        // No ABI so we don't know the constructor params which comes from verified contracts on Etherscan
        return
    }
    // we need this flag to determine if there was no constructor params or they are unknown
    trace.parsedConstructorParams = true

    // if we don't have the ABI then we won't have the constructorInputs but we'll double check anyway
    if (!contracts[trace.to]?.constructorInputs?.length) {
        return
    }
    const constructorParams = defaultAbiCoder.decode(
        constructor.inputs,
        "0x" + contracts[trace.to]?.constructorInputs
    )
    // For each constructor param, add to the trace input params
    constructorParams.forEach((param, i) => {
        const components = addValuesToComponents(constructor.inputs[i], param)

        trace.inputParams.push({
            name: constructor.inputs[i].name,
            type: constructor.inputs[i].type,
            value: param,
            components,
        })
    })
    debug(`Decoded ${trace.inputParams.length} constructor params.`)
}

const parseEvent = (contract: Contract, log: LogDescription): Event => {
    const params: Param[] = []

    // For each event param
    log.eventFragment.inputs.forEach((param, i) => {
        const components = addValuesToComponents(
            log.eventFragment.inputs[i],
            param
        )

        params.push({
            name: log.eventFragment.inputs[i].name,
            type: log.eventFragment.inputs[i].type,
            value: log.args[i],
            components,
        })
    })

    return {
        name: log.name,
        params,
    }
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
