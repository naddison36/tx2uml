import {getContractMessages, getToken, getTransactionDetails} from "./AlethioClient"
import { getContract } from "./EtherscanClient"

const debug = require("debug")("tx2uml")

export enum MessageType {
  Value,
  Call,
  Create,
  Selfdestruct
}

export type Param = {
  name: string
  type: string
  value: string
}

export type Payload = {
  funcName: string
  funcSelector: string
  inputs: Param[]
  outputs: Param[]
}

export type Message = {
  id: number
  type: MessageType
  from: string
  to: string
  value: bigint
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
  timestamp: Date
  status: boolean
  error?: string
}

export type Networks = "mainnet" | "ropsten" | "rinkeby" | "kovan"

export interface DataSourceOptions {
  etherscanApiKey?: string
  alethioApiKey?: string
  network?: Networks
}

export const getTransaction = async (
  txHash: string,
  options: DataSourceOptions = {}
): Promise<[Message[], Contracts, TransactionDetails]> => {
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
    contracts[address] = await getContract(
      address,
      options.etherscanApiKey,
      network
    )
    const token = await getToken(address, options.alethioApiKey, network)
    if (token) {
      contracts[address].tokenName = token.name
      contracts[address].symbol = token.symbol
    }
  }

  return [messages, contracts, details]
}
