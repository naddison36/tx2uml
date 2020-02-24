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

  for (const [address, names] of Object.entries(contracts)) {
    if (names.contractName) {
      plantUml += `participant "${shortAddress(address)}" as ${participantId(
        address
      )} <<${names.contractName}>>\n`
    } else {
      plantUml += `participant "${shortAddress(address)}" as ${participantId(
        address
      )}\n`
    }
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
  let contractCallStack: string[] = [] // array of contract addresses
  let previousMessage: Message | undefined
  let plantUml = "\n"
  // for each contract call
  for (const message of messages) {
    if (previousMessage && message.from !== previousMessage.to) {
      // reserve() is mutable so need to copy the array wih a spread operator
      const reservedCallStack = [...contractCallStack].reverse()
      for (const contractAddress of reservedCallStack) {
        plantUml += `return\n`
        contractCallStack.pop()
        if (message.from === contractAddress) {
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

      // If a successful transaction
      if (message.status === true) {
        contractCallStack.push(message.from)
      } else {
        // a failed transaction so end the lifeline
        plantUml += `destroy ${participantId(message.to)}\n`
        if (message.error) {
          plantUml += `note right: ${message.error}\n`
        }
        // clear callstack as we don't want to output any more returns
        contractCallStack = []
      }
    } else if (message.type === MessageType.Value) {
      // convert wei to Ethers which is to 18 decimal places
      const ethers = new BigNumber(message.value.toString()).div(
        new BigNumber(10).pow(18)
      )
      plantUml += `${participantId(message.from)} ${genArrow(
        message
      )} ${participantId(message.to)}: ${ethers.toFormat(2)} ETH\n`
    } else if (message.type === MessageType.Selfdestruct) {
      plantUml += `return selfdestruct\n`
      // selfdestruct is the return so pop the previous contract call
      contractCallStack.pop()
    }
    previousMessage = message
  }
  contractCallStack.reverse().forEach(() => {
    plantUml += `return\n`
  })

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
