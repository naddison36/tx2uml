import axios from "axios"
import { VError } from "verror"
import {Message, MessageType, Networks, TransactionDetails} from "./transaction"
import { transactionHash } from "./regEx";
import { stringify } from "./utils"

const debug = require('debug')('tx2uml')

const alethioBaseUrls = {
  mainnet: 'https://api.aleth.io/v1',
  ropsten: 'https://api.ropsten.aleth.io/v1',
  rinkeby: 'https://api.rinkebyaleth.io/v1',
  kovan: 'https://api.kovan.aleth.io/v1',
}

export const getTransactionDetails = async (
  txHash: string,
  apiKey?: string,
  network: Networks = "mainnet"
): Promise<[TransactionDetails, Message]> => {
  if (!txHash.match(transactionHash)) {
    throw new TypeError(`Transaction hash "${txHash}" must be 32 bytes in hexadecimal format with a 0x prefix`)
  }

  try {
    if (apiKey) {
      axios.defaults.headers.common["Authorization"] = apiKey
    }
    const response = await axios.get(`${alethioBaseUrls[network]}/transactions/${txHash}`);

    if (!response?.data?.data?.attributes) {
      throw new Error(`no transaction attributes in Alethio response: ${response?.data}`)
    }
    if (!response?.data?.data?.relationships) {
      throw new Error(`no transaction relationships in Alethio response: ${response?.data}`)
    }

    const attributes = response.data.data.attributes
    const relationships = response.data.data.relationships

    const details: TransactionDetails = {
      hash: txHash,
      nonce: attributes.txNonce,
      index: attributes.txIndex,
      value: BigInt(attributes.value),
      gasPrice: BigInt(attributes.txGasPrice),
      timestamp: new Date(attributes.blockCreationTime * 1000),
      status: !attributes.msgError,
      error: attributes.msgErrorString,
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
      error: attributes.msgErrorString,
    }
    debug(`Got tx details and first message from Alethio:\ndetails: ${stringify(details)}\nfirst message: ${stringify(firstMessage)}`)

    return [details, firstMessage]
  } catch (err) {
    throw new VError(err, `Failed to get transaction details for hash ${txHash} from Alethio`)
  }
}

export const getContractMessages = async (txHash: string, apiKey?: string, network: Networks = "mainnet"): Promise<Message[]> => {
  if (!txHash.match(transactionHash)) {
    throw new TypeError(`Transaction hash "${txHash}" must be 32 bytes in hexadecimal format with a 0x prefix`)
  }

  let messages: Message[] = [];
  try {
    if (apiKey) {
      axios.defaults.headers.common["Authorization"] = apiKey
    }
    // get the contract messages
    const response = await axios.get(`${alethioBaseUrls[network]}/transactions/${txHash}/contractMessages`, {
      params: {
        "page[limit]": 100,
      }
    });

    if (!Array.isArray(response?.data?.data)) {
      throw new Error(`no contract messages in Alethio response ${response?.data}`)
    }

    for (const contractMessage of response.data.data) {
      messages.push({
        id: contractMessage.attributes.cmsgIndex,
        type: convertType(contractMessage.attributes.msgType),
        from: contractMessage.relationships.from.data.id,
        to: contractMessage.relationships.to.data.id,
        value: BigInt(contractMessage.attributes.value),
        payload: contractMessage.attributes.msgPayload,
        gasUsed: BigInt(contractMessage.attributes.msgGasUsed),
        gasLimit: BigInt(contractMessage.attributes.msgGasLimit),
        callDepth: contractMessage.attributes.msgCallDepth,
        status: !contractMessage.attributes.msgError,
        error: contractMessage.attributes.msgErrorString,
      })
    }

    debug(`Got ${messages.length} messages from Alethio`)

    // handle more than 100 contract messages
    if (response.data?.meta?.page?.hasNext) {
      const nextCursor = response.data.links.next.split('=').pop();
      messages = await getContractMessagesRecursive(txHash, nextCursor, messages)
    }

    // sort by contract message id
    const sortedMessages = messages.sort((a, b) => a.id - b.id)

    debug(`Sorted ${sortedMessages.length} messages in total from Alethio`)

    return sortedMessages

  } catch (err) {
    throw new VError(err, `Failed to get contract messages for transaction hash ${txHash} from Alethio`)
  }
}

const getContractMessagesRecursive = async (
  txHash: string,
  cursor: string,
  messages: Message[] = [],
  apiKey?: string,
  network: Networks = "mainnet"
): Promise<Message[]> => {
  if (!txHash.match(transactionHash)) {
    throw new TypeError(`Transaction hash "${txHash}" must be 32 bytes in hexadecimal format with a 0x prefix`)
  }
  if (!cursor) {
    throw new TypeError(`Missing Alethio pagination cursor "${cursor}"`)
  }

  let cursorMessages: Message[] = []
  try {
    if (apiKey) {
      axios.defaults.headers.common["Authorization"] = apiKey
    }
    const response = await axios.get(`${alethioBaseUrls[network]}/transactions/${txHash}/contractMessages`, {
      params: {
        "page[limit]": 100,
        "page[next]": cursor,
      }
    });

    if (!Array.isArray(response?.data?.data)) {
      throw new Error(`no contract messages in Alethio response ${response?.data}`)
    }

    for (const contractMessage of response.data.data) {
      cursorMessages.push({
        id: contractMessage.attributes.cmsgIndex,
        type: convertType(contractMessage.attributes.msgType),
        from: contractMessage.relationships.from.data.id,
        to: contractMessage.relationships.to.data.id,
        value: BigInt(contractMessage.attributes.value),
        payload: contractMessage.attributes.msgPayload,
        gasUsed: BigInt(contractMessage.attributes.msgGasUsed),
        gasLimit: BigInt(contractMessage.attributes.msgGasLimit),
        callDepth: contractMessage.attributes.msgCallDepth,
        status: !contractMessage.attributes.msgError,
        error: contractMessage.attributes.msgErrorString,
      })
    }

    const allMessages = messages.concat(cursorMessages)

    debug(`Got ${cursorMessages.length} messages of ${allMessages.length} for cursor ${cursor} from Alethio`)

    // handle more than 100 contract messages
    if (response.data?.meta?.page?.hasNext) {
      const nextCursor = response.data.links.next.split('=').pop();
      return getContractMessagesRecursive(txHash, nextCursor, allMessages)
    }

    return allMessages

  } catch (err) {
    throw new VError(err, `Failed to get contract messages for transaction hash ${txHash} from Alethio`)
  }
}

const convertType = (msgType: string): MessageType => {
  let type: MessageType = MessageType.Call
  if (msgType === "ValueContractMsg" || msgType === "ValueTx") {
    type = MessageType.Value
  } else if (msgType === "CreateContractMsg" || msgType === "CreateTx") {
    type = MessageType.Value
  } else if (msgType === "SelfdestructContractMsg" || msgType === "SelfdestructTx") {
    type = MessageType.Selfdestruct
  }
  return type
}
