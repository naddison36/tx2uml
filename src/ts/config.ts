import { existsSync, readFileSync } from "fs"

const debug = require("debug")("tx2uml")

export interface JsonFragmentType {
    readonly name?: string
    readonly indexed?: boolean
    readonly type?: string
    readonly internalType?: any // @TODO: in v6 reduce type
    readonly components?: ReadonlyArray<JsonFragmentType>
}

export interface JsonFragment {
    readonly name?: string
    readonly type?: string

    readonly anonymous?: boolean

    readonly payable?: boolean
    readonly constant?: boolean
    readonly stateMutability?: string

    readonly inputs?: ReadonlyArray<JsonFragmentType>
    readonly outputs?: ReadonlyArray<JsonFragmentType>

    readonly gas?: string
}

export interface ContractConfig {
    tokenName?: string
    tokenSymbol?: string
    contractName?: string
    protocolName?: string
    nft?: boolean
    abi?: ReadonlyArray<JsonFragment>
}

export interface ContractsConfig {
    [address: string]: ContractConfig
}

export const loadConfig = async (
    fileName: string = "./tx.config.json"
): Promise<ContractsConfig> => {
    let config: ContractsConfig = {}
    if (existsSync(fileName)) {
        config = JSON.parse(readFileSync(fileName, "utf-8"))
        debug(`loaded config file ${fileName}`)
    }

    return config
}

export const loadGenericAbi = async (
    fileName: string = "./tx.abi.json"
): Promise<ReadonlyArray<JsonFragment>> => {
    let abi: ReadonlyArray<JsonFragment> = []
    if (existsSync(fileName)) {
        abi = JSON.parse(readFileSync(fileName, "utf-8"))
        debug(`loaded generic abi file ${fileName}`)
    }
    return abi
}
