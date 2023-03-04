import { BigNumber } from "ethers"
import { Contract as EthersContract } from "@ethersproject/contracts"
import { Log } from "@ethersproject/abstract-provider"

export enum MessageType {
    Unknown,
    Call,
    Create,
    Selfdestruct,
    DelegateCall,
    StaticCall,
}

export type Param = {
    name: string
    type: string
    value?: string
    components?: Param[]
}

export type Trace = {
    id: number
    type: MessageType
    from: string
    // For child traces of delegate calls. delegatedFrom = the parent delegate call's to address
    delegatedFrom: string
    to: string
    value: BigNumber
    funcSelector?: string
    funcName?: string
    inputs?: string
    inputParams?: Param[]
    parsedConstructorParams?: boolean
    outputs?: string
    outputParams?: Param[]
    proxy?: boolean
    gasLimit: BigNumber
    gasUsed: BigNumber
    parentTrace?: Trace
    childTraces: Trace[]
    depth: number
    error?: string
}

export type Event = {
    name: string
    params: Param[]
}

export type Contract = {
    address: string
    noContract: boolean
    contractName?: string
    appName?: string
    balance?: number
    tokenName?: string
    symbol?: string
    protocol?: string
    decimals?: number
    proxyImplementation?: string
    ethersContract?: EthersContract
    delegatedToContracts?: Contract[]
    constructorInputs?: string
    events?: Event[]
    minDepth?: number
    labels?: string[]
}
export type Contracts = { [address: string]: Contract }

export interface TokenDetails {
    address: string
    noContract: boolean
    nft?: boolean
    tokenName?: string
    tokenSymbol?: string
    decimals?: number
    implementation?: string
}
export interface Participant extends TokenDetails {
    protocol?: string
    name?: string
    labels?: string[]
}
export type Participants = { [address: string]: Participant }

// Mapping of participant address to token addresses to balances
export interface Position {
    balance: BigNumber
    addedIds: Set<number>
    removedIds: Set<number>
}
// Participant -> Token -> Position
export type ParticipantPositions = {
    [address: string]: {
        [address: string]: Position
    }
}

export interface Label {
    name: string
    labels: string[]
}
export type Labels = { [address: string]: Label }

export type Token = {
    address: string
    name: string
    symbol: string
    decimals?: number
    totalSupply?: BigNumber
}

export enum TransferType {
    Transfer,
    Mint,
    Burn,
}

export type Transfer = {
    pc: number
    from: string
    to: string
    value?: BigNumber
    tokenId?: number
    event?: string
    type: TransferType
    tokenAddress?: string
    tokenSymbol?: string
    tokenName?: string
    decimals?: number
}

export interface TransactionDetails {
    hash: string
    from: string
    to: string
    data: string
    nonce: number
    index: number
    value: BigNumber
    gasPrice: BigNumber
    maxPriorityFeePerGas?: BigNumber
    maxFeePerGas?: BigNumber
    gasLimit: BigNumber
    gasUsed: BigNumber
    timestamp: Date
    status: boolean
    blockNumber: number
    logs: Array<Log>
    error?: string
}

export type ParamTypeInternal = {
    name: string
    type: string
    baseType: string
    components?: ParamTypeInternal[]
}

export const nodeTypes = [
    "geth",
    "erigon",
    "nether",
    "openeth",
    "tgeth",
    "besu",
    "anvil",
] as const

export const networks = <const>[
    "mainnet",
    "goerli",
    "sepolia",
    "polygon",
    "testnet.polygon",
    "arbitrum",
    "testnet.arbitrum",
    "avalanche",
    "testnet.avalanche",
    "bsc",
    "testnet.bsc",
    "crono",
    "fantom",
    "testnet.fantom",
    "moonbeam",
    "optimistic",
    "kovan-optimistic",
    "gnosisscan",
]
export type Network = (typeof networks)[number]

export const outputFormats = <const>["png", "svg", "eps", "puml"]
export type OutputFormat = (typeof outputFormats)[number]

export interface OutputOptions {
    outputFilename?: string
    outputFormat?: OutputFormat
    memory?: number
}

export interface PlantUmlOptions {
    format?: OutputFormat
    config?: string
    memory?: number
}

export interface TracePumlGenerationOptions extends OutputOptions {
    chain?: Network
    depth?: number
    noGas?: boolean
    noParams?: boolean
    noEther?: boolean
    noTxDetails?: boolean
    noLogDetails?: boolean
    noDelegates?: boolean
}

export interface CallDiagramOptions extends TracePumlGenerationOptions {
    url?: string
    nodeType: string
    noAddresses?: string[]
    etherscanKey?: string
    configFile?: string
}

export interface TransferPumlGenerationOptions extends OutputOptions {
    chain?: Network
    url?: string
    etherscanKey?: string
    configFile?: string
}

export interface CopyOptions {
    destUrl: string
    url: string
    nodeType?: string
    impersonate?: string
}
