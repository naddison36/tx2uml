import { BigNumber } from "ethers";
import { Contract as EthersContract } from "@ethersproject/contracts";
import { Log } from "@ethersproject/abstract-provider";
export declare enum MessageType {
    Unknown = 0,
    Call = 1,
    Create = 2,
    Selfdestruct = 3,
    DelegateCall = 4,
    StaticCall = 5
}
export type Param = {
    name: string;
    type: string;
    value?: string;
    components?: Param[];
};
export type Trace = {
    id: number;
    type: MessageType;
    from: string;
    delegatedFrom: string;
    to: string;
    value: BigNumber;
    funcSelector?: string;
    funcName?: string;
    inputs?: string;
    inputParams?: Param[];
    parsedConstructorParams?: boolean;
    outputs?: string;
    outputParams?: Param[];
    proxy?: boolean;
    gasLimit: BigNumber;
    gasUsed: BigNumber;
    parentTrace?: Trace;
    childTraces: Trace[];
    depth: number;
    error?: string;
};
export type Event = {
    name: string;
    params: Param[];
};
export type Contract = {
    address: string;
    noContract: boolean;
    contractName?: string;
    appName?: string;
    balance?: number;
    tokenName?: string;
    symbol?: string;
    protocol?: string;
    decimals?: number;
    proxyImplementation?: string;
    ethersContract?: EthersContract;
    delegatedToContracts?: Contract[];
    constructorInputs?: string;
    events?: Event[];
    minDepth?: number;
    labels?: string[];
    ensName?: string;
};
export type Contracts = {
    [address: string]: Contract;
};
export interface TokenDetails {
    address: string;
    noContract: boolean;
    nft?: boolean;
    tokenName?: string;
    tokenSymbol?: string;
    decimals?: number;
    implementation?: string;
    ensName?: string;
}
export interface Participant extends TokenDetails {
    protocol?: string;
    name?: string;
    labels?: string[];
}
export type Participants = {
    [address: string]: Participant;
};
export interface Position {
    balance: BigNumber;
    addedIds: Set<string>;
    removedIds: Set<string>;
}
export type ParticipantPositions = {
    [address: string]: {
        [address: string]: Position;
    };
};
export interface Label {
    name: string;
    labels: string[];
}
export type Labels = {
    [address: string]: Label;
};
export type Token = {
    address: string;
    name: string;
    symbol: string;
    decimals?: number;
    totalSupply?: BigNumber;
};
export declare enum TransferType {
    Transfer = 0,
    Mint = 1,
    Burn = 2
}
export type Transfer = {
    pc: number;
    from: string;
    to: string;
    value?: BigNumber;
    tokenId?: BigNumber;
    event?: string;
    type: TransferType;
    tokenAddress?: string;
    tokenSymbol?: string;
    tokenName?: string;
    decimals?: number;
};
export interface TransactionDetails {
    hash: string;
    network?: string;
    from: string;
    to: string;
    data: string;
    nonce: number;
    index: number;
    value: BigNumber;
    gasPrice: BigNumber;
    maxPriorityFeePerGas?: BigNumber;
    maxFeePerGas?: BigNumber;
    gasLimit: BigNumber;
    gasUsed: BigNumber;
    timestamp: Date;
    status: boolean;
    blockNumber: number;
    logs: Array<Log>;
    error?: string;
}
export type ParamTypeInternal = {
    name: string;
    type: string;
    baseType: string;
    components?: ParamTypeInternal[];
};
export declare const nodeTypes: readonly ["geth", "erigon", "nether", "openeth", "tgeth", "besu", "anvil", "reth"];
export declare const networks: readonly ["mainnet", "custom", "none", "goerli", "sepolia", "arbitrum", "optimisim", "polygon", "avalanche", "bsc", "crono", "fantom", "gnosis", "moonbeam", "celo", "base"];
export type Network = (typeof networks)[number];
export declare const setNetworkCurrency: (network: Network) => "AVAX" | "MATIC" | "BNB" | "CRO" | "FTM" | "xDAI" | "GLMR" | "CELO" | "ETH";
export declare const outputFormats: readonly ["png", "svg", "eps", "puml"];
export type OutputFormat = (typeof outputFormats)[number];
export interface OutputOptions {
    outputFilename?: string;
    outputFormat?: OutputFormat;
    memory?: number;
}
export interface PlantUmlOptions {
    format?: OutputFormat;
    config?: string;
    memory?: number;
}
export interface TracePumlGenerationOptions extends OutputOptions {
    depth?: number;
    noGas?: boolean;
    noParams?: boolean;
    noParamValues?: boolean;
    noEther?: boolean;
    noTxDetails?: boolean;
    noLogDetails?: boolean;
    noDelegates?: boolean;
    chain?: Network;
}
export interface SourceMap {
    contract: string;
    source: string;
}
export interface CallDiagramOptions extends TracePumlGenerationOptions {
    chain?: Network;
    explorerUrl?: string;
    url?: string;
    nodeType: string;
    noAddresses?: string[];
    etherscanKey?: string;
    configFile?: string;
    abiFile?: string;
    mapSource?: SourceMap[];
}
export interface TransferPumlGenerationOptions extends OutputOptions {
    chain?: Network;
    explorerUrl?: string;
    url?: string;
    etherscanKey?: string;
    configFile?: string;
    onlyToken?: boolean;
    mapSource?: SourceMap[];
}
export interface CopyOptions {
    destUrl: string;
    url: string;
    nodeType?: string;
    impersonate?: string;
}
