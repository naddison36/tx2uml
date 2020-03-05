import {
  Contracts,
  Message,
  MessageType,
  Param,
  TransactionDetails
} from "./transaction"
import { Readable } from "stream"

const debug = require("debug")("tx2uml")

export interface PumlGenerationOptions {
  gas?: boolean
  params?: boolean
  ether?: boolean
  network?: string
}

const DelegateLifelineColor = "#809ECB"
const DelegateMessageColor = "#3471CD"

export const streamPlantUml = (
  messages: Message[],
  contracts: Contracts,
  details: TransactionDetails,
  options: PumlGenerationOptions = {}
): Readable => {
  const pumlStream = new Readable({
    read() {}
  })
  pumlStream.push(`@startuml\ntitle ${details.hash}\n`)
  pumlStream.push(genCaption(details, options))
  writeParticipants(pumlStream, contracts)
  writeMessages(pumlStream, messages, options)

  pumlStream.push("\n@endumls")
  pumlStream.push(null)

  return pumlStream
}

export const writeParticipants = (
  plantUmlStream: Readable,
  contracts: Contracts
) => {
  plantUmlStream.push("\n")

  for (const [address, contract] of Object.entries(contracts)) {
    let name: string = ""
    if (contract.tokenName) {
      if (contract.symbol) {
        name = `<<${contract.tokenName} (${contract.symbol})>>`
      } else {
        name = `<<${contract.tokenName}>>`
      }
    }
    if (contract.contractName) {
      name += `<<${contract.contractName}>>`
    }

    plantUmlStream.push(
      `participant "${shortAddress(address)}" as ${participantId(
        address
      )} ${name}\n`
    )
  }
}

export const participantId = (address: string): string => {
  return address.substr(2, 4) + address.substr(-4, 4)
}

export const shortAddress = (address: string): string => {
  return address.substr(0, 6) + ".." + address.substr(-4, 4)
}

export const writeMessages = (
  plantUmlStream: Readable,
  messages: Message[],
  options: PumlGenerationOptions = {}
) => {
  if (!messages?.length) {
    return
  }
  let contractCallStack: Message[] = []
  let previousMessage: Message | undefined
  plantUmlStream.push("\n")
  // for each contract message
  for (const message of messages) {
    debug(
      `id ${message.id}, parent ${message.parentId}, from ${shortAddress(
        message.from
      )}, to ${shortAddress(message.to)}, ${message?.payload?.funcName} [${
        message.gasUsed
      }] ${message?.payload?.funcSelector}, type ${
        message.type
      }, delegated call ${message.delegatedCall?.id} last ${
        message.delegatedCall?.last
      }`
    )
    // return from lifeline if processing has moved to a different contract
    // except when the previous message was a delegatecall
    if (
      previousMessage &&
      message.from !== previousMessage.to &&
      previousMessage.type !== MessageType.Delegatecall
    ) {
      // reserve() is mutable so need to copy the array wih a spread operator
      const reservedCallStack = [...contractCallStack].reverse()
      for (const callStack of reservedCallStack) {
        plantUmlStream.push(genEndLifeline(callStack))
        contractCallStack.pop()
        // stop returns when the callstack is back to this message's lifeline
        if (message.from === callStack.from) {
          break
        }
      }
    }

    // if the previous message was the last delegated call
    if (previousMessage?.delegatedCall?.last) {
      // return from the delegated lifeline
      plantUmlStream.push("return\n")
    }

    if (
      message.type === MessageType.Call ||
      message.type === MessageType.Create ||
      message.type === MessageType.Delegatecall
    ) {
      // output call message
      plantUmlStream.push(
        `${participantId(message.from)} ${genArrow(message)} ${participantId(
          message.to
        )}: ${genFunctionText(message, options.params)}${genGasUsage(
          message,
          options.gas
        )}${genEtherValue(message, options.ether)}\n`
      )

      if (message.type === MessageType.Delegatecall) {
        plantUmlStream.push(
          `activate ${participantId(message.to)} ${DelegateLifelineColor}\n`
        )
      } else {
        plantUmlStream.push(`activate ${participantId(message.to)}\n`)
        contractCallStack.push(message)
      }
    } else if (message.type === MessageType.Value) {
      plantUmlStream.push(
        `${participantId(message.from)} ${genArrow(message)} ${participantId(
          message.to
        )}: ${message.value.toString()} ETH${genGasUsage(
          message,
          options.gas
        )}\n`
      )
      // we want to avoid a return in the next loop so setting previous message from field so no returns are printed
      if (previousMessage) {
        previousMessage.to = message.from
      }
      continue
    } else if (message.type === MessageType.Selfdestruct) {
      plantUmlStream.push(`return selfdestruct\n`)
      // selfdestruct is the return so pop the previous contract call
      contractCallStack.pop()
    }

    previousMessage = message
  }
  contractCallStack.reverse().forEach(callStack => {
    plantUmlStream.push(genEndLifeline(callStack))
  })
}

const genEndLifeline = (message: Message): string => {
  let plantUml = ""
  if (message.status) {
    plantUml += `return\n`
  } else {
    // a failed transaction so end the lifeline
    plantUml += `destroy ${participantId(message.to)}\n`
  }
  if (message.error) {
    plantUml += `note right of ${participantId(message.to)}: ${message.error}\n`
  }
  return plantUml
}

const genArrow = (message: Message): string => {
  const arrowColor = isNaN(message.delegatedCall?.id)
    ? ""
    : `[${DelegateMessageColor}]`
  if (message.type === MessageType.Call) {
    return `-${arrowColor}>`
  }
  if (message.type === MessageType.Value) {
    return `-${arrowColor}>>`
  }
  if (message.type === MessageType.Create) {
    return `-${arrowColor}>o`
  }
  if (message.type === MessageType.Selfdestruct) {
    return `-${arrowColor}\\`
  }

  return `-${arrowColor}>`
}

const genFunctionText = (message: Message, params: boolean = false): string => {
  if (!message?.payload) {
    return ""
  } else if (message.type === MessageType.Create) {
    return "create"
  }
  const payload = message.payload
  if (!payload.funcSelector) {
    return params ? "fallback()" : "fallback"
  }
  if (!payload.funcName) {
    return `${payload.funcSelector}`
  }
  return params
    ? `${payload.funcName}(${genParams(payload.inputs)})`
    : payload.funcName
}

export const genParams = (params: Param[], plantUml = ""): string => {
  if (!params) {
    return ""
  }

  for (const param of params) {
    if (param.name) {
      plantUml += `${param.name}: `
    }
    if (param.type === "address") {
      plantUml += `${shortAddress(param.value)}, `
    } else if (param.type.slice(0, 5) === "bytes") {
      plantUml += `${param.type}, `
    } else if (param.components) {
      if (Array.isArray(param.components)) {
        plantUml += `[`
        plantUml = genParams(param.components as Param[], plantUml)
        plantUml += `], `
      } else {
        debug(`Unsupported components type ${JSON.stringify(param.components)}`)
      }
    } else {
      plantUml += `${param.value}, `
    }
  }

  return plantUml.slice(0, -2)
}

const genGasUsage = (message: Message, gasUsage: boolean = false): string => {
  if (!gasUsage) {
    return ""
  }
  return ` [${message.gasUsed}]`
}

const genEtherValue = (
  message: Message,
  etherValue: boolean = false
): string => {
  if (!etherValue || message.value.eq(0)) {
    return ""
  }
  return ` ${message.value.toString()} ETH`
}

const genCaption = (
  details: TransactionDetails,
  options: PumlGenerationOptions
): string => {
  return `caption ${options.network || ""} ${details.timestamp.toUTCString()} `
  // `gas price ${details.gasPrice}, limit ${details.gasLimit}`
}
