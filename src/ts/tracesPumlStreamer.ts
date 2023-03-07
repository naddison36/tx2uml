import { Readable } from "stream"
import { formatEther, formatUnits } from "ethers/lib/utils"
import { BigNumber } from "ethers"

import {
    Contracts,
    MessageType,
    Param,
    Trace,
    TracePumlGenerationOptions,
    TransactionDetails,
} from "./types/tx2umlTypes"
import {
    formatNumber,
    participantId,
    shortAddress,
    shortBytes,
} from "./utils/formatters"

const debug = require("debug")("tx2uml")

const DelegateLifelineColor = "#809ECB"
const DelegateMessageColor = "#3471CD"
const FailureFillColor = "#FFAAAA"

export const traces2PumlStream = (
    transactions: TransactionDetails[],
    traces: Trace[][],
    contracts: Contracts,
    options: TracePumlGenerationOptions
): Readable => {
    const pumlStream = new Readable({
        read() {},
    })
    if (transactions.length > 1) {
        multiTxTraces2PumlStream(
            pumlStream,
            transactions,
            traces,
            contracts,
            options
        )
    } else {
        singleTx2PumlStream(
            pumlStream,
            transactions[0],
            traces[0],
            contracts,
            options
        )
    }

    return pumlStream
}

export const multiTxTraces2PumlStream = (
    pumlStream: Readable,
    transactions: TransactionDetails[],
    traces: Trace[][],
    contracts: Contracts,
    options: TracePumlGenerationOptions = {}
) => {
    pumlStream.push(`@startuml\n`)
    pumlStream.push(genCaption(transactions))
    writeParticipants(pumlStream, contracts, options)
    let i = 0
    for (const transaction of transactions) {
        pumlStream.push(`\ngroup ${transaction.hash}`)
        writeTransactionDetails(pumlStream, transaction, options)
        writeMessages(pumlStream, traces[i++], options)
        writeEvents(pumlStream, contracts, options)
        pumlStream.push("\nend")
    }

    pumlStream.push("\n@endumls")
    pumlStream.push(null)

    return pumlStream
}

export const singleTx2PumlStream = (
    pumlStream: Readable,
    transaction: TransactionDetails,
    traces: Trace[],
    contracts: Contracts,
    options: TracePumlGenerationOptions
): Readable => {
    pumlStream.push(`@startuml\ntitle ${transaction.hash}\n`)
    pumlStream.push(genCaption(transaction))
    writeParticipants(pumlStream, contracts, options)
    writeTransactionDetails(pumlStream, transaction, options)
    writeMessages(pumlStream, traces, options)
    writeEvents(pumlStream, contracts, options)

    pumlStream.push("\n@endumls")
    pumlStream.push(null)

    return pumlStream
}

export const writeParticipants = (
    plantUmlStream: Readable,
    contracts: Contracts,
    options: TracePumlGenerationOptions = {}
) => {
    plantUmlStream.push("\n")

    // output remaining contracts as actors or participants
    let participantType = "actor"
    for (const [address, contract] of Object.entries(contracts)) {
        // Do not write contract as a participant if min depth greater than trace depth
        if (options.depth > 0 && contract.minDepth > options.depth) continue

        let name: string = ""
        if (contract.protocol) name += `<<${contract.protocol}>>`
        if (contract.tokenName) name += `<<${contract.tokenName}>>`
        if (contract.symbol) name += `<<(${contract.symbol})>>`
        if (contract.contractName) name += `<<${contract.contractName}>>`
        if (contract.ensName) name += `<<(${contract.ensName})>>`

        debug(`Write lifeline ${shortAddress(address)} with stereotype ${name}`)
        plantUmlStream.push(
            `${participantType} "${shortAddress(address)}" as ${participantId(
                address
            )} ${name}\n`
        )
        participantType = "participant"
    }
}

const writeTransactionDetails = (
    plantUmlStream: Readable,
    transaction: TransactionDetails,
    options: TracePumlGenerationOptions = {}
): void => {
    if (options.noTxDetails) {
        return
    }
    plantUmlStream.push(`\nnote over ${participantId(transaction.from)}`)
    if (transaction.error) {
        plantUmlStream.push(
            ` ${FailureFillColor}\nError: ${transaction.error} \n`
        )
    } else {
        // no error so will use default colour of tx details note
        plantUmlStream.push("\n")
    }
    plantUmlStream.push(`Nonce: ${transaction.nonce.toLocaleString()}\n`)
    plantUmlStream.push(
        `Gas Price: ${formatUnits(transaction.gasPrice, "gwei")} Gwei\n`
    )
    if (transaction.maxFeePerGas) {
        plantUmlStream.push(
            `Max Fee: ${formatUnits(transaction.maxFeePerGas, "gwei")} Gwei\n`
        )
    }
    if (transaction.maxPriorityFeePerGas) {
        plantUmlStream.push(
            `Max Priority: ${formatUnits(
                transaction.maxPriorityFeePerGas,
                "gwei"
            )} Gwei\n`
        )
    }
    plantUmlStream.push(
        `Gas Limit: ${formatNumber(transaction.gasLimit.toString())}\n`
    )
    plantUmlStream.push(
        `Gas Used: ${formatNumber(transaction.gasUsed.toString())}\n`
    )
    const txFeeInWei = transaction.gasUsed.mul(transaction.gasPrice)
    const txFeeInEther = formatEther(txFeeInWei)
    const tFeeInEtherFormatted = Number(txFeeInEther).toLocaleString()
    plantUmlStream.push(`Tx Fee: ${tFeeInEtherFormatted} ETH\n`)
    plantUmlStream.push("end note\n")
}

export const writeMessages = (
    plantUmlStream: Readable,
    traces: Trace[],
    options: TracePumlGenerationOptions = {}
) => {
    if (!traces?.length) {
        return
    }
    let contractCallStack: Trace[] = []
    let previousTrace: Trace | undefined
    plantUmlStream.push("\n")
    // for each trace
    for (const trace of traces) {
        if (trace.depth > options.depth) continue
        debug(`Write message ${trace.id} from ${trace.from} to ${trace.to}`)
        // return from lifeline if processing has moved to a different contract
        if (trace.delegatedFrom !== previousTrace?.to) {
            // contractCallStack is mutated in the loop so make a copy
            for (const callStack of [...contractCallStack]) {
                // stop returns when the callstack is back to this trace's lifeline
                if (trace.delegatedFrom === callStack.to) {
                    break
                }
                plantUmlStream.push(genEndLifeline(callStack, options))
                contractCallStack.shift()
            }
        }

        if (trace.type === MessageType.Selfdestruct) {
            plantUmlStream.push(
                `${participantId(trace.from)} ${genArrow(
                    trace
                )} ${participantId(trace.from)}: Self-Destruct\n`
            )
            // TODO add ETH value transfer to refund address if there was a contract balance
        } else {
            const beforeParams = `${participantId(trace.from)} ${genArrow(
                trace
            )} ${participantId(trace.to)}: `

            const afterParams = `${genGasUsage(
                trace.gasUsed,
                options.noGas
            )}${genEtherValue(trace, options.noEther)}\n`

            const rawParams = `${genFunctionText(trace, options.noParams)}`
            const maxParamLength =
                2000 - beforeParams.length - afterParams.length

            const truncatedParams = rawParams.slice(0, maxParamLength)
            if (maxParamLength < rawParams.length)
                console.warn(
                    `params were truncated by ${
                        truncatedParams.length - maxParamLength
                    } characters`
                )
            plantUmlStream.push(beforeParams + truncatedParams + afterParams)

            if (trace.type === MessageType.DelegateCall) {
                plantUmlStream.push(
                    `activate ${participantId(
                        trace.to
                    )} ${DelegateLifelineColor}\n`
                )
            } else {
                plantUmlStream.push(`activate ${participantId(trace.to)}\n`)
            }
        }

        if (trace.type !== MessageType.Selfdestruct) {
            contractCallStack.unshift(trace)
            previousTrace = trace
        }
    }
    contractCallStack.forEach(callStack => {
        plantUmlStream.push(genEndLifeline(callStack, options))
    })
}

const genEndLifeline = (
    trace: Trace,
    options: TracePumlGenerationOptions = {}
): string => {
    let plantUml = ""
    if (!trace.error) {
        if (options.noParams) {
            plantUml += `return\n`
        } else {
            plantUml += `return${genParams(trace.outputParams)}\n`
        }
        if (!options.noGas && trace.childTraces.length > 0) {
            const gasUsedLessChildCalls = calculateGasUsedLessChildTraces(trace)
            if (gasUsedLessChildCalls?.gt(0)) {
                plantUml += `note right of ${participantId(
                    trace.to
                )}: ${genGasUsage(gasUsedLessChildCalls)}\n`
            }
        }
    } else {
        // a failed transaction so end the lifeline
        plantUml += `destroy ${participantId(trace.to)}\nreturn\n`
        plantUml += `note right of ${participantId(
            trace.to
        )} ${FailureFillColor}: ${trace.error}\n`
    }
    return plantUml
}

const calculateGasUsedLessChildTraces = (
    trace: Trace
): BigNumber | undefined => {
    // Sum gasUsed on all child traces of the parent
    let gasUsedLessChildTraces = BigNumber.from(0)
    for (const childTrace of trace.childTraces) {
        if (!childTrace.gasUsed) {
            return undefined
        }
        gasUsedLessChildTraces = gasUsedLessChildTraces.add(childTrace.gasUsed)
    }
    return trace.gasUsed.sub(gasUsedLessChildTraces)
}

const genArrow = (trace: Trace): string => {
    const arrowColor =
        trace.parentTrace?.type === MessageType.DelegateCall
            ? `[${DelegateMessageColor}]`
            : ""
    const line = trace.proxy ? "--" : "-"
    if (trace.type === MessageType.DelegateCall) {
        return `${line}${arrowColor}>>`
    }
    if (trace.type === MessageType.Create) {
        return `${line}${arrowColor}>o`
    }
    if (trace.type === MessageType.Selfdestruct) {
        return `${line}${arrowColor}\\`
    }

    // Call and Staticcall are the same
    return `${line}${arrowColor}>`
}

const genFunctionText = (trace: Trace, noParams: boolean = false): string => {
    if (!trace) {
        return ""
    }
    if (trace.type === MessageType.Create) {
        if (noParams) {
            return "constructor"
        }
        // If we have the contract ABI so the constructor params could be parsed
        if (trace.parsedConstructorParams) {
            return `${trace.funcName}(${genParams(trace.inputParams)})`
        }
        // we don't know if there was constructor params or not as the contract was not verified on Etherscan
        // hence we don't have the constructor params or the contract ABI to parse them.
        return "constructor(?)"
    }
    if (!trace.funcSelector) {
        return noParams ? "fallback" : "fallback()"
    }
    if (!trace.funcName) {
        return `${trace.funcSelector}`
    }
    if (noParams) return trace.funcName

    return noParams
        ? trace.funcName
        : `${trace.funcName}(${genParams(trace.inputParams)})`
}

const oneIndent = "  "
export const genParams = (
    params: Param[],
    plantUml = "",
    indent: string = ""
): string => {
    if (!params) {
        return ""
    }
    for (const param of params) {
        // put each param on a new line.
        // The \ needs to be escaped with \\
        plantUml += "\\n" + indent
        if (param.name) {
            plantUml += `${param.name}: `
        }
        if (param.type === "address") {
            plantUml += `${shortAddress(param.value)},`
        } else if (param.components) {
            if (Array.isArray(param.components)) {
                plantUml += `[`
                plantUml = `${genParams(
                    param.components,
                    plantUml,
                    indent + oneIndent
                )}`
                plantUml += `],`
            } else {
                debug(
                    `Unsupported components type ${JSON.stringify(
                        param.components
                    )}`
                )
            }
        } else if (Array.isArray(param.value)) {
            // not a component but an array of params
            plantUml += `[`
            param.value.forEach((value, i) => {
                plantUml = `${genParams(
                    [
                        {
                            name: i.toString(),
                            value,
                            // remove the [] at the end of the type
                            type: param.type.slice(0, -2),
                        },
                    ],
                    plantUml,
                    indent + oneIndent
                )}`
            })
            plantUml += `],`
        } else if (param.type.slice(0, 5) === "bytes") {
            plantUml += `${shortBytes(param.value)},`
        } else if (param.type.match("int")) {
            plantUml += `${formatNumber(param.value)},`
        } else {
            plantUml += `${param.value},`
        }
    }

    return plantUml.slice(0, -1)
}

const genGasUsage = (
    gasUsed?: BigNumber,
    noGasUsage: boolean = false
): string => {
    if (noGasUsage || !gasUsed) {
        return ""
    }
    // Add thousand comma separators
    const gasValueWithCommas = formatNumber(gasUsed.toString())
    return `\\n${gasValueWithCommas} gas`
}

const genEtherValue = (trace: Trace, noEtherValue: boolean = false): string => {
    if (noEtherValue || trace.value.eq(0)) {
        return ""
    }
    // Convert wei value to Ether
    const ether = formatEther(trace.value)
    // Add thousand commas. Can't use formatNumber for this as it doesn't handle decimal numbers.
    // Assuming the amount of ether is not great than JS number limit.
    const etherFormatted = Number(ether).toLocaleString()
    return `\\n${etherFormatted} ETH`
}

const genCaption = (
    details: Readonly<TransactionDetails> | readonly TransactionDetails[]
): string => {
    if (Array.isArray(details)) {
        let caption = "footer\n"
        details.forEach(
            detail =>
                (caption += `${detail.network}, block ${
                    detail.blockNumber
                }, ${detail.timestamp.toUTCString()}\n`)
        )
        caption += "\nendfooter"
        return caption
    } else {
        const detail = details as TransactionDetails
        return `\ncaption ${detail.network}, block ${
            detail.blockNumber
        }, ${detail.timestamp.toUTCString()}`
    }
}

export const writeEvents = (
    plantUmlStream: Readable,
    contracts: Contracts,
    options: TracePumlGenerationOptions = {}
) => {
    if (options.noLogDetails) {
        return
    }
    // For each contract
    let firstEvent = true
    for (const contract of Object.values(contracts)) {
        if (
            contract.ethersContract &&
            contract.events?.length &&
            (options.depth === undefined || contract.minDepth <= options.depth)
        ) {
            const align = firstEvent ? "" : "/ "
            firstEvent = false
            plantUmlStream.push(
                `\n${align}note over ${participantId(contract.address)} #aqua`
            )
            for (const event of contract.events) {
                plantUmlStream.push(`\n${event.name}:`)
                plantUmlStream.push(
                    `${genParams(event.params).replace(/\\n/g, "\n  ")}`
                )
            }
            plantUmlStream.push("\nend note\n")
        }
    }
}
