import { BigNumber, Contract as EthersContract } from "ethers";
import { Log } from "@ethersproject/abstract-provider";
import EtherscanClient from "./clients/EtherscanClient";
import EthereumNodeClient from "./clients/EthereumNodeClient";
export declare enum MessageType {
    Unknown = 0,
    Call = 1,
    Create = 2,
    Selfdestruct = 3,
    DelegateCall = 4,
    StaticCall = 5
}
export declare type Param = {
    name: string;
    type: string;
    value?: string;
    components?: Param[];
};
export declare type Trace = {
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
export declare type Event = {
    name: string;
    params: Param[];
};
export declare type Contract = {
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
};
export declare type TokenDetails = {
    address: string;
    noContract: boolean;
    name?: string;
    symbol?: string;
    decimals?: number;
};
export declare type Contracts = {
    [address: string]: Contract;
};
export declare type Token = {
    address: string;
    name: string;
    symbol: string;
    decimals?: number;
    totalSupply?: BigNumber;
};
export declare type Transfer = {
    pc: number;
    from: string;
    to: string;
    value?: BigNumber;
    tokenId?: number;
    tokenAddress?: string;
    tokenSymbol?: string;
    tokenName?: string;
    decimals?: number;
};
export interface TransactionDetails {
    hash: string;
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
export declare const networks: readonly ["mainnet", "goerli", "sepolia", "polygon", "testnet.polygon", "arbitrum", "testnet.arbitrum", "avalanche", "testnet.avalanche", "bsc", "testnet.bsc", "crono", "fantom", "testnet.fantom", "moonbeam", "optimistic", "kovan-optimistic", "gnosisscan"];
export declare type Network = typeof networks[number];
export declare class TransactionManager {
    readonly ethereumNodeClient: EthereumNodeClient;
    readonly etherscanClient: EtherscanClient;
    apiConcurrencyLimit: number;
    constructor(ethereumNodeClient: EthereumNodeClient, etherscanClient: EtherscanClient, apiConcurrencyLimit?: number);
    getTransactions(txHashes: string | string[]): Promise<TransactionDetails[]>;
    getTransaction(txHash: string): Promise<TransactionDetails>;
    getTraces(transactions: TransactionDetails[]): Promise<Trace[][]>;
    getContractsFromTraces(transactionsTraces: Trace[][], configFilename?: string): Promise<Contracts>;
    getContractsFromTransfers(transactionsTransfers: Transfer[][], configFilename?: string): Promise<Contracts>;
    getContractsFromAddresses(addresses: string[]): Promise<Contracts>;
    setTokenAttributes(contracts: Contracts): Promise<void>;
    configOverrides(contracts: Contracts, filename?: string): Promise<void>;
    static parseTraceParams(traces: Trace[][], contracts: Contracts): void;
    static parseTransactionLogs(logs: Array<Log>, contracts: Contracts): void;
    static parseTraceDepths(traces: Trace[][], contracts: Contracts): void;
    static filterTransactionTraces(transactionTraces: Trace[][], contracts: Contracts, options: {
        noDelegates?: boolean;
        excludedContracts?: string[];
    }): [Trace[][], Contracts];
}
