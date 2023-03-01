import { Log } from "@ethersproject/abstract-provider";
import EtherscanClient from "./clients/EtherscanClient";
import EthereumNodeClient from "./clients/EthereumNodeClient";
import { Contracts, Participants, Trace, TransactionDetails, Transfer } from "./types/tx2umlTypes";
export declare class TransactionManager {
    readonly ethereumNodeClient: EthereumNodeClient;
    readonly etherscanClient: EtherscanClient;
    apiConcurrencyLimit: number;
    constructor(ethereumNodeClient: EthereumNodeClient, etherscanClient: EtherscanClient, apiConcurrencyLimit?: number);
    getTransactions(txHashes: string | string[]): Promise<TransactionDetails[]>;
    getTransaction(txHash: string): Promise<TransactionDetails>;
    getTraces(transactions: TransactionDetails[]): Promise<Trace[][]>;
    getContractsFromTraces(transactionsTraces: Trace[][], configFilename?: string): Promise<Contracts>;
    getTransferParticipants(transactionsTransfers: Transfer[][], configFilename?: string): Promise<Participants>;
    getContractsFromAddresses(addresses: string[]): Promise<Contracts>;
    setTokenAttributes(contracts: Contracts): Promise<void>;
    configOverrides(contracts: Contracts & Participants, filename?: string): Promise<void>;
    static parseTraceParams(traces: Trace[][], contracts: Contracts): void;
    static parseTransactionLogs(logs: Array<Log>, contracts: Contracts): void;
    static parseTraceDepths(traces: Trace[][], contracts: Contracts): void;
    static filterTransactionTraces(transactionTraces: Trace[][], contracts: Contracts, options: {
        noDelegates?: boolean;
        excludedContracts?: string[];
    }): [Trace[][], Contracts];
}
