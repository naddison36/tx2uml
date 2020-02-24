import { Contracts, Message, MessageType, Param } from "./transaction"

export const genPlantUml = (
  messages: Message[],
  contracts: Contracts
): string => {
  let plantUml = "@startuml\n"
  plantUml += genParticipants(contracts)
  plantUml += genMessages(messages)

  plantUml += "\n@endumls"

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
  const contractCallStack: string[] = [] // array of contract addresses
  let previousMessage: Message | undefined
  let plantUml = "\n"
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
    if (message.type !== MessageType.Selfdestruct) {
      plantUml += `${participantId(message.from)} ${genArrow(
        message
      )} ${participantId(message.to)}: ${genMessageText(message, params)}\n`
      plantUml += `activate ${participantId(message.to)}\n`
      contractCallStack.push(message.from)
    } else {
      plantUml += `return ${genMessageText(message, params)} \n`
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
  if (!message.status) {
    return "-x"
  }
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

const genMessageText = (message: Message, params: boolean = false): string => {
  if (message.type === MessageType.Value) {
    return `<< ${message.value} wei >>`
  }
  if (message.type === MessageType.Selfdestruct) {
    return "selfdestruct"
  }
  if (message.payload?.funcName) {
    const funcName = message.payload.funcName || "fallback"
    if (params) {
      return `${funcName}(${genParams(message.payload.inputs)})`
    }
    return funcName
  }
  return `${message.payload?.funcSelector}`
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
