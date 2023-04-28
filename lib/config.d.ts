export interface JsonFragmentType {
    readonly name?: string;
    readonly indexed?: boolean;
    readonly type?: string;
    readonly internalType?: any;
    readonly components?: ReadonlyArray<JsonFragmentType>;
}
export interface JsonFragment {
    readonly name?: string;
    readonly type?: string;
    readonly anonymous?: boolean;
    readonly payable?: boolean;
    readonly constant?: boolean;
    readonly stateMutability?: string;
    readonly inputs?: ReadonlyArray<JsonFragmentType>;
    readonly outputs?: ReadonlyArray<JsonFragmentType>;
    readonly gas?: string;
}
export interface ContractConfig {
    tokenName?: string;
    tokenSymbol?: string;
    contractName?: string;
    protocolName?: string;
    nft?: boolean;
    abi?: ReadonlyArray<JsonFragment>;
}
export interface ContractsConfig {
    [address: string]: ContractConfig;
}
export declare const loadConfig: (fileName?: string) => Promise<ContractsConfig>;
export declare const loadGenericAbi: (fileName?: string) => Promise<ReadonlyArray<JsonFragment>>;
