import {
  getContractMessages,
  getToken,
  getTransactionDetails
} from "./AlethioClient"
import { getContract } from "./EtherscanClient"
import BigNumber from "bignumber.js"
import { transactionHash } from "./regEx"

const debug = require("debug")("tx2uml")

export enum MessageType {
  Value,
  Call,
  Create,
  Selfdestruct,
  Delegatecall
}

export type Param = {
  name: string
  type: string
  value?: string
  components?: object[]
}

export type Payload = {
  funcName: string
  funcSelector: string
  inputs: Param[]
  outputs: Param[]
}

export type DelegatedDetails = {
  id: number // starts from 0
  last: boolean
}

export type Message = {
  id: number
  type: MessageType
  from: string
  to: string
  parentId?: number
  delegatedCall?: DelegatedDetails
  value: BigNumber
  payload?: Payload
  gasUsed: bigint
  gasLimit: bigint
  callDepth: number
  status: boolean
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
}

export type Contracts = { [address: string]: Contract }

export type Token = {
  address: string
  name: string
  symbol: string
  decimals?: number
  totalSupply?: bigint
}

export interface TransactionDetails {
  hash: string
  nonce: number
  index: number
  value: bigint
  gasPrice: bigint
  gasLimit: bigint
  timestamp: Date
  status: boolean
  error?: string
}

export type Networks = "mainnet" | "ropsten" | "rinkeby" | "kovan"
export type TransactionInfo = {
  messages: Message[]
  contracts: Contracts
  details: TransactionDetails
}

export interface DataSourceOptions {
  alethioApiKey?: string
  network?: Networks
}

export const getTransactions = async (
  txHashes: string | string[],
  options: DataSourceOptions
): Promise<TransactionInfo | TransactionInfo[]> => {
  if (Array.isArray(txHashes)) {
    const transactions: TransactionInfo[] = []
    for (const txHash of txHashes) {
      if (!txHash?.match(transactionHash)) {
        console.error(
          `Array of transaction hashes must be in hexadecimal format with a 0x prefix`
        )
        process.exit(1)
      }
      transactions.push(await getTransaction(txHash, options))
    }
    return transactions
  }
  if (txHashes?.match(transactionHash)) {
    return await getTransaction(txHashes, options)
  }

  throw new Error(`Failed to parse tx hash or array of transactions hashes`)
}

export const getTransaction = async (
  txHash: string,
  options: DataSourceOptions = {}
): Promise<TransactionInfo> => {
  const network = options.network || "mainnet"
  const txDetailsPromise = getTransactionDetails(
    txHash,
    options.alethioApiKey,
    network
  )
  const messagesPromise = getContractMessages(
    txHash,
    options.alethioApiKey,
    network
  )

  const [[details, firstMessage], contractMessages] = await Promise.all([
    txDetailsPromise,
    messagesPromise
  ])

  const messages: Message[] = [firstMessage, ...contractMessages]

  const contracts: Contracts = {}
  const contractAddresses = messages.map(m => m.to)
  const uniqueAddresses = new Set([firstMessage.from, ...contractAddresses])
  debug(`${uniqueAddresses.size} participants in the transaction`)
  for (const address of uniqueAddresses) {
    contracts[address] = await getContract(address, undefined, network)
    const token = await getToken(address, options.alethioApiKey, network)
    if (token) {
      contracts[address].tokenName = token.name
      contracts[address].symbol = token.symbol
    }
  }

  return {
    messages,
    contracts,
    details
  }
}
