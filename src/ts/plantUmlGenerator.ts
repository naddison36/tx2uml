import {
  Contracts,
  Message,
  MessageType,
  Param,
  Payload,
  TransactionDetails
} from "./transaction"
import BigNumber from "bignumber.js"

const debug = require("debug")("tx2uml")

export interface PumlGenerationOptions {
  gas?: boolean
  params?: boolean
  network?: string
}

const DelegateLifelineColor = "#809ECB"
const DelegateMessageColor = "#3471CD"

export const genPlantUml = (
  messages: Message[],
  contracts: Contracts,
  details: TransactionDetails,
  options: PumlGenerationOptions = {}
): string => {
  let plantUml = `@startuml\ntitle ${options.network || ""} ${details.hash}`
  plantUml += genParticipants(contracts)
  plantUml += genMessages(messages, options)

  plantUml += "\n@endumls"

  debug(plantUml)

  return plantUml
}

export const genParticipants = (contracts: Contracts): string => {
  let plantUml = "\n"

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

    plantUml += `participant "${shortAddress(address)}" as ${participantId(
      address
    )} ${name}\n`
  }

  return plantUml
}

export const participantId = (address: string): string => {
  return address.substr(2, 4) + address.substr(-4, 4)
}

export const shortAddress = (address: string): string => {
  return address.substr(0, 6) + ".." + address.substr(-4, 4)
}

export const genMessages = (
  messages: Message[],
  options: PumlGenerationOptions = {}
): string => {
  if (!messages?.length) {
    return ""
  }
  let contractCallStack: Message[] = []
  let delegateMessages: { [parentId: string]: number } = {}
  let previousMessage: Message | undefined
  let plantUml = "\n"
  // for each contract message
  for (const message of messages) {
    debug(
      `id ${message.id}, parent ${message.parentId}, from ${shortAddress(
        message.from
      )}, to ${shortAddress(message.to)}, ${message?.payload?.funcName} [${
        message.gasUsed
      }] ${message?.payload?.funcSelector}`
    )
    // return from lifeline if processing has moved to a different contract
    if (previousMessage && message.from !== previousMessage.to) {
      // don't return if this message is the first delegate call
      // this return will be moved to once all the delegate calls have been generated
      if (message.parentId && !delegateMessages[message.parentId]) {
        // replace old activate lifeline line with coloured activate lifeline for the previous delegate call
        plantUml = plantUml.replace(/\n.*\n$/, "\n")
        plantUml += `activate ${participantId(
          previousMessage.to
        )} ${DelegateLifelineColor}\n`

        // Remove previous delegate call from the call stack as we'll handle the delegate lifeline separately
        contractCallStack.pop()

        // remember the last call in the delegated lifeline
        const lifelineMessages = messages.filter(
          m => m.parentId === message.parentId
        )
        // get the id of the last delegate message
        delegateMessages[message.parentId] = lifelineMessages.slice(-1)[0].id
      } else {
        // reserve() is mutable so need to copy the array wih a spread operator
        const reservedCallStack = [...contractCallStack].reverse()
        for (const callStack of reservedCallStack) {
          plantUml += genEndLifeline(callStack)
          contractCallStack.pop()
          // stop returns when the callstack is back to this message's lifeline
          if (message.from === callStack.from) {
            break
          }
        }
      }
    }

    // if the previous message was the last delegated message
    if (
      previousMessage &&
      previousMessage.id === delegateMessages[previousMessage?.parentId]
    ) {
      // return from the delegated lifeline
      plantUml += "return\n"
    }

    if (
      message.type === MessageType.Call ||
      message.type === MessageType.Create
    ) {
      // output call message
      plantUml += `${participantId(message.from)} ${genArrow(
        message
      )} ${participantId(message.to)}: ${genFunctionText(
        message.payload,
        options.params
      )}${genGasUsage(message, options.gas)}\n`
      plantUml += `activate ${participantId(message.to)}\n`

      contractCallStack.push(message)
    } else if (message.type === MessageType.Value) {
      // convert wei to Ethers which is to 18 decimal places
      const ethers = new BigNumber(message.value.toString()).div(
        new BigNumber(10).pow(18)
      )
      plantUml += `${participantId(message.from)} ${genArrow(
        message
      )} ${participantId(message.to)}: ${ethers.toFormat(2)} ETH${genGasUsage(
        message,
        options.gas
      )}\n`
      // we want to avoid a return in the next loop so setting previous message from field so no returns are printed
      previousMessage.to = message.from
      continue
    } else if (message.type === MessageType.Selfdestruct) {
      plantUml += `return selfdestruct\n`
      // selfdestruct is the return so pop the previous contract call
      contractCallStack.pop()
    }

    previousMessage = message
  }
  contractCallStack.reverse().forEach(callStack => {
    plantUml += genEndLifeline(callStack)
  })

  return plantUml
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
  const delegateColor = message.parentId ? `[${DelegateMessageColor}]` : ""
  if (message.type === MessageType.Call) {
    return `-${delegateColor}>`
  }
  if (message.type === MessageType.Value) {
    return `-${delegateColor}>>`
  }
  if (message.type === MessageType.Create) {
    return `-${delegateColor}>o`
  }
  if (message.type === MessageType.Selfdestruct) {
    return `-${delegateColor}\\`
  }

  return `-${delegateColor}>`
}

const genFunctionText = (payload: Payload, params: boolean = false): string => {
  if (!payload) {
    return ""
  }
  if (payload.funcName) {
    const funcName = payload.funcName || "fallback"
    if (params) {
      return `${funcName}(${genParams(payload.inputs)})`
    }
    return funcName
  }
  return `${payload.funcSelector}`
}

export const genParams = (params: Param[]): string => {
  if (!params) {
    return ""
  }

  let plantUml = ""
  for (const param of params) {
    if (param.type === "address") {
      plantUml += `${param.name}: ${shortAddress(param.value)}, `
    } else {
      plantUml += `${param.name}: ${param.value}, `
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
