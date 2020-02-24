export declare enum MessageType {
    Value = 0,
    Call = 1,
    Create = 2,
    Selfdestruct = 3
}
export declare type Param = {
    name: string;
    type: string;
    value: string;
};
export declare type Payload = {
    funcName: string;
    funcSelector: string;
    inputs: Param[];
    outputs: Param[];
};
export declare type Message = {
    id: number;
    type: MessageType;
    from: string;
    to: string;
    value: bigint;
    payload?: Payload;
    gasUsed: bigint;
    gasLimit: bigint;
    callDepth: number;
    status: boolean;
    error?: string;
};
export declare type Contract = {
    contractName?: string;
    appName?: string;
    balance?: number;
};
export declare type Contracts = {
    [address: string]: Contract;
};
export interface TransactionDetails {
    hash: string;
    nonce: number;
    index: number;
    value: bigint;
    gasPrice: bigint;
    timestamp: Date;
    status: boolean;
    error?: string;
}
export declare type Networks = "mainnet" | "ropsten" | "rinkeby" | "kovan";
export interface DataSourceOptions {
    etherscanApiKey?: string;
    alethioApiKey?: string;
    network?: Networks;
}
export declare const getTransaction: (txHash: string, options?: DataSourceOptions) => Promise<[Message[], Contracts, TransactionDetails]>;
