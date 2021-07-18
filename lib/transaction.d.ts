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
    contractName?: string;
    appName?: string;
    balance?: number;
    tokenName?: string;
    symbol?: string;
    decimals?: number;
    proxyImplementation?: string;
    ethersContract?: EthersContract;
    constructorInputs?: string;
    events?: Event[];
    minDepth?: number;
};
export declare type TokenDetails = {
    address: string;
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
    from: string;
    to: string;
    value: BigNumber;
    ether: boolean;
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
    gasLimit: BigNumber;
    gasUsed: BigNumber;
    timestamp: Date;
    status: boolean;
    blockNumber: number;
    logs: Array<Log>;
    error?: string;
}
export declare type Networks = "mainnet" | "ropsten" | "rinkeby" | "kovan";
export declare class TransactionManager {
    readonly ethereumNodeClient: EthereumNodeClient;
    readonly etherscanClient: EtherscanClient;
    apiConcurrencyLimit: number;
    constructor(ethereumNodeClient: EthereumNodeClient, etherscanClient: EtherscanClient, apiConcurrencyLimit?: number);
    getTransactions(txHashes: string | string[]): Promise<TransactionDetails[]>;
    getTransaction(txHash: string): Promise<TransactionDetails>;
    getTraces(transactions: TransactionDetails[]): Promise<Trace[][]>;
    getContracts(transactionsTraces: Trace[][]): Promise<Contracts>;
    getContractsFromAddresses(addresses: string[]): Promise<Contracts>;
    setTokenAttributes(contracts: Contracts): Promise<Contracts>;
    static parseTraceParams(traces: Trace[][], contracts: Contracts): void;
    static parseTransactionLogs(logs: Array<Log>, contracts: Contracts): void;
    static parseTraceDepths(traces: Trace[][], contracts: Contracts): void;
    static filterTransactionTraces(transactionTraces: Trace[][], contracts: Contracts, options: {
        noDelegates?: boolean;
    }): [Trace[][], Contracts];
}
