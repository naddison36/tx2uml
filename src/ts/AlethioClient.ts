import axios from "axios"
import { VError } from "verror"
import {
  Message,
  MessageType,
  Networks,
  Token,
  TransactionDetails
} from "./transaction"
import { ethereumAddress, transactionHash } from "./regEx"
import { stringify } from "./utils"

const debug = require("debug")("tx2uml")

const alethioBaseUrls = {
  mainnet: "https://api.aleth.io/v1",
  ropsten: "https://api.ropsten.aleth.io/v1",
  rinkeby: "https://api.rinkebyaleth.io/v1",
  kovan: "https://api.kovan.aleth.io/v1"
}

export const getTransactionDetails = async (
  txHash: string,
  apiKey?: string,
  network: Networks = "mainnet"
): Promise<[TransactionDetails, Message]> => {
  if (!txHash?.match(transactionHash)) {
    throw new TypeError(
      `Transaction hash "${txHash}" must be 32 bytes in hexadecimal format with a 0x prefix`
    )
  }
  const url = `${alethioBaseUrls[network]}/transactions/${txHash}`

  try {
    if (apiKey) {
      axios.defaults.headers.common["Authorization"] = `Bearer ${apiKey}`
    }
    const response = await axios.get(url)

    if (!response?.data?.data?.attributes) {
      throw new Error(
        `no transaction attributes in Alethio response: ${response?.data}`
      )
    }
    if (!response?.data?.data?.relationships) {
      throw new Error(
        `no transaction relationships in Alethio response: ${response?.data}`
      )
    }

    const attributes = response.data.data.attributes
    const relationships = response.data.data.relationships

    const details: TransactionDetails = {
      hash: txHash,
      nonce: attributes.txNonce,
      index: attributes.txIndex,
      value: BigInt(attributes.value),
      gasPrice: BigInt(attributes.txGasPrice),
      gasLimit: BigInt(attributes.msgGasLimit),
      timestamp: new Date(attributes.blockCreationTime * 1000),
      status: !attributes.msgError,
      error: attributes.msgErrorString
    }
    const firstMessage: Message = {
      id: 0,
      type: convertType(attributes.msgType),
      from: relationships.from.data.id,
      to: relationships.to.data.id,
      value: BigInt(attributes.value),
      payload: attributes.msgPayload,
      gasUsed: BigInt(attributes.txGasUsed),
      gasLimit: BigInt(attributes.msgGasLimit),
      callDepth: 0,
      status: !attributes.msgError,
      error: attributes.msgErrorString
    }
    debug(
      `Got tx details and first message from Alethio:\ndetails: ${stringify(
        details
      )}\nfirst message: ${stringify(firstMessage)}`
    )

    return [details, firstMessage]
  } catch (err) {
    throw new VError(
      err,
      `Failed to get transaction details for hash ${txHash} from Alethio using url ${url}`
    )
  }
}

export const getContractMessages = async (
  txHash: string,
  apiKey?: string,
  network: Networks = "mainnet"
): Promise<Message[]> => {
  if (!txHash?.match(transactionHash)) {
    throw new TypeError(
      `Transaction hash "${txHash}" must be 32 bytes in hexadecimal format with a 0x prefix`
    )
  }
  const url = `${alethioBaseUrls[network]}/transactions/${txHash}/contractMessages`

  let messages: Message[] = []
  try {
    if (apiKey) {
      axios.defaults.headers.common["Authorization"] = `Bearer ${apiKey}`
    }
    const response = await axios.get(url)

    if (!Array.isArray(response?.data?.data)) {
      throw new Error(
        `no contract messages in Alethio response ${response?.data}`
      )
    }

    for (const contractMessage of response.data.data) {
      const parentId = contractMessage.relationships.parentContractMessage?.data?.id
        ?.split(":")
        ?.pop()

      messages.push({
        id: contractMessage.attributes.cmsgIndex,
        type: convertType(contractMessage.attributes.msgType),
        from: contractMessage.relationships.from.data.id,
        to: contractMessage.relationships.to.data.id,
        parentId: parentId ? parseInt(parentId) : parentId,
        value: BigInt(contractMessage.attributes.value),
        payload: contractMessage.attributes.msgPayload,
        gasUsed: BigInt(contractMessage.attributes.msgGasUsed),
        gasLimit: BigInt(contractMessage.attributes.msgGasLimit),
        callDepth: contractMessage.attributes.msgCallDepth,
        status: !contractMessage.attributes.msgError,
        error: contractMessage.attributes.msgErrorString
      })
    }

    debug(`Got ${messages.length} messages from Alethio`)

    // handle more than 100 contract messages
    if (response.data?.meta?.page?.hasNext) {
      const nextCursor = response.data.links.next.split("=").pop()
      messages = await getContractMessagesRecursive(
        txHash,
        nextCursor,
        messages
      )
    }

    return identifyDelegateCalls(messages)
  } catch (err) {
    throw new VError(
      err,
      `Failed to get contract messages for transaction hash ${txHash} from Alethio at url ${url}`
    )
  }
}

const getContractMessagesRecursive = async (
  txHash: string,
  cursor: string,
  messages: Message[] = [],
  apiKey?: string,
  network: Networks = "mainnet"
): Promise<Message[]> => {
  if (!txHash?.match(transactionHash)) {
    throw new TypeError(
      `Transaction hash "${txHash}" must be 32 bytes in hexadecimal format with a 0x prefix`
    )
  }
  if (!cursor) {
    throw new TypeError(`Missing Alethio pagination cursor "${cursor}"`)
  }
  const url = `${alethioBaseUrls[network]}/transactions/${txHash}/contractMessages`

  let cursorMessages: Message[] = []
  try {
    if (apiKey) {
      axios.defaults.headers.common["Authorization"] = `Bearer ${apiKey}`
    }
    const response = await axios.get(url, {
      params: {
        "page[limit]": 100,
        "page[next]": cursor
      }
    })

    if (!Array.isArray(response?.data?.data)) {
      throw new Error(
        `no contract messages in Alethio response ${response?.data}`
      )
    }

    for (const contractMessage of response.data.data) {
      const parentId = contractMessage.relationships.parentContractMessage?.data?.id
        ?.split(":")
        ?.pop()

      cursorMessages.push({
        id: contractMessage.attributes.cmsgIndex,
        type: convertType(contractMessage.attributes.msgType),
        from: contractMessage.relationships.from.data.id,
        to: contractMessage.relationships.to.data.id,
        parentId: parentId ? parseInt(parentId) : parentId,
        value: BigInt(contractMessage.attributes.value),
        payload: contractMessage.attributes.msgPayload,
        gasUsed: BigInt(contractMessage.attributes.msgGasUsed),
        gasLimit: BigInt(contractMessage.attributes.msgGasLimit),
        callDepth: contractMessage.attributes.msgCallDepth,
        status: !contractMessage.attributes.msgError,
        error: contractMessage.attributes.msgErrorString
      })
    }

    const allMessages = messages.concat(cursorMessages)

    debug(
      `Got ${cursorMessages.length} messages of ${allMessages.length} for cursor ${cursor} from Alethio`
    )

    // handle more than 100 contract messages
    if (response.data?.meta?.page?.hasNext) {
      const nextCursor = response.data.links.next.split("=").pop()
      return getContractMessagesRecursive(txHash, nextCursor, allMessages)
    }

    return allMessages
  } catch (err) {
    throw new VError(
      err,
      `Failed to get contract messages for transaction hash ${txHash} from Alethio`
    )
  }
}

// identifies delegate calls where the parent's to does NOT equal the child's from
// sets the message type on the delegatecall messages and delegatedCall on the child messages
const identifyDelegateCalls = (messages: Message[]): Message[] => {
  try {
    // sort by contract message id
    messages = messages.sort((a, b) => a.id - b.id)
    const delegateCounts: { [parentId: number]: number } = {}
    messages.forEach((message, i) => {
      if (!isNaN(message.parentId)) {
        // if message's from not equal to parent's to
        if (messages[i].from !== messages[message.parentId - 1].to) {
          messages[message.parentId - 1].type = MessageType.Delegatecall
          if (!delegateCounts[message.parentId]) {
            delegateCounts[message.parentId] = 0
          }
          messages[i].delegatedCall = {
            id: delegateCounts[message.parentId]++,
            last: false
          }
        }
      }
    })

    // set the last child delegated call
    const delegateCallIds: number[] = Object.keys(delegateCounts).map(id =>
      parseInt(id)
    )
    for (const parentId of delegateCallIds) {
      const delegatedCalls = messages.filter(m => m.parentId === parentId)
      const lastCallId = delegatedCalls[delegatedCalls.length - 1].id
      messages[lastCallId - 1].delegatedCall.last = true
      debug(
        `id ${parentId} is a delegatecall. Last child call has id ${lastCallId}`
      )
    }

    debug(
      `${messages.length} messages in total from Alethio. ${delegateCallIds.length} delegate calls`
    )

    return messages
  } catch (err) {
    throw new VError(
      err,
      `Failed to initialise the ${messages.length} Alethio messages.`
    )
  }
}

const convertType = (msgType: string): MessageType => {
  let type: MessageType = MessageType.Call
  if (msgType === "ValueContractMsg" || msgType === "ValueTx") {
    type = MessageType.Value
  } else if (msgType === "CreateContractMsg" || msgType === "CreateTx") {
    type = MessageType.Create
  } else if (
    msgType === "SelfdestructContractMsg" ||
    msgType === "SelfdestructTx"
  ) {
    type = MessageType.Selfdestruct
  }
  return type
}

export const getToken = async (
  contractAddress: string,
  apiKey?: string,
  network: Networks = "mainnet"
): Promise<Token | null> => {
  if (!contractAddress?.match(ethereumAddress)) {
    throw new TypeError(
      `Contract address "${contractAddress}" must be 20 bytes in hexadecimal format with a 0x prefix`
    )
  }
  const url = `${alethioBaseUrls[network]}/tokens/${contractAddress}`

  try {
    if (apiKey) {
      axios.defaults.headers.common["Authorization"] = `Bearer ${apiKey}`
    }
    const response = await axios.get(url)

    if (!response?.data?.data?.attributes) {
      throw new Error(
        `no token attributes in Alethio response: ${response?.data}`
      )
    }

    const attributes = response.data.data.attributes

    const token: Token = {
      address: contractAddress,
      name: attributes.name,
      symbol: attributes.symbol,
      decimals: attributes.decimals,
      totalSupply: BigInt(attributes.totalSupply)
    }

    debug(`Got token from Alethio: ${stringify(token)}`)

    return token
  } catch (err) {
    if (err?.response?.status === 404) {
      debug(
        `Could not find token details for contract ${contractAddress} from Alethio`
      )
      return null
    }
    throw new VError(
      err,
      `Failed to get token for address ${contractAddress} from Alethio using url ${url}`
    )
  }
}
