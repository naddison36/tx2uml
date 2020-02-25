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

export const genPlantUml = (
  messages: Message[],
  contracts: Contracts,
  details: TransactionDetails
): string => {
  let plantUml = `@startuml\ntitle ${details.hash}`
  plantUml += genParticipants(contracts)
  plantUml += genMessages(messages)

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
  params: boolean = false
): string => {
  if (!messages?.length) {
    return ""
  }
  let contractCallStack: Message[] = [] // array of contract addresses
  let previousMessage: Message | undefined
  let plantUml = "\n"
  // for each contract message
  for (const message of messages) {
    if (previousMessage && message.from !== previousMessage.to) {
      // reserve() is mutable so need to copy the array wih a spread operator
      const reservedCallStack = [...contractCallStack].reverse()
      for (const callStack of reservedCallStack) {
        plantUml += genEndLifeline(callStack)
        contractCallStack.pop()
        if (message.from === callStack.from) {
          break
        }
      }
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
        params
      )}\n`
      plantUml += `activate ${participantId(message.to)}\n`

      contractCallStack.push(message)
    } else if (message.type === MessageType.Value) {
      // convert wei to Ethers which is to 18 decimal places
      const ethers = new BigNumber(message.value.toString()).div(
        new BigNumber(10).pow(18)
      )
      plantUml += `${participantId(message.from)} ${genArrow(
        message
      )} ${participantId(message.to)}: ${ethers.toFormat(2)} ETH\n`
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
  if (message.type === MessageType.Call) {
    return "->"
  }
  if (message.type === MessageType.Value) {
    return "->>"
  }
  if (message.type === MessageType.Create) {
    return "->o"
  }
  if (message.type === MessageType.Selfdestruct) {
    return "-\\"
  }

  return "->"
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
    if (param.type === " address") {
      plantUml += `${param.name}: ${shortAddress(param.value)}, `
    } else {
      plantUml += `${param.name}: ${param.value}, `
    }
  }

  return plantUml.slice(0, -2)
}
