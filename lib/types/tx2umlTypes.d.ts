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
};
export type Contracts = {
    [address: string]: Contract;
};
export type TokenDetails = {
    address: string;
    noContract: boolean;
    name?: string;
    symbol?: string;
    decimals?: number;
    protocol?: string;
};
export type Participants = {
    [address: string]: TokenDetails;
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
    tokenId?: number;
    event?: string;
    type: TransferType;
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
export type ParamTypeInternal = {
    name: string;
    type: string;
    baseType: string;
    components?: ParamTypeInternal[];
};
export declare const networks: readonly ["mainnet", "goerli", "sepolia", "polygon", "testnet.polygon", "arbitrum", "testnet.arbitrum", "avalanche", "testnet.avalanche", "bsc", "testnet.bsc", "crono", "fantom", "testnet.fantom", "moonbeam", "optimistic", "kovan-optimistic", "gnosisscan"];
export type Network = typeof networks[number];
