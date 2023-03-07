/* Autogenerated file. Do not edit manually. */
/* tslint:disable */
/* eslint-disable */

import type {
    BaseContract,
    BigNumber,
    BigNumberish,
    BytesLike,
    CallOverrides,
    PopulatedTransaction,
    Signer,
    utils,
} from "ethers"

import { Listener, Provider } from "@ethersproject/providers"
import { FunctionFragment, Result } from "@ethersproject/abi"
import {
    OnEvent,
    PromiseOrValue,
    TypedEvent,
    TypedEventFilter,
    TypedListener,
} from "./TypeChain"

export declare namespace TokenInfo {
    export type InfoStruct = {
        symbol: PromiseOrValue<string>
        name: PromiseOrValue<string>
        decimals: PromiseOrValue<BigNumberish>
        noContract: PromiseOrValue<boolean>
        nft: PromiseOrValue<boolean>
        ensName: PromiseOrValue<string>
    }

    export type InfoStructOutput = [
        string,
        string,
        BigNumber,
        boolean,
        boolean,
        string
    ] & {
        symbol: string
        name: string
        decimals: BigNumber
        noContract: boolean
        nft: boolean
        ensName: string
    }
}

export interface TokenInfoInterface extends utils.Interface {
    functions: {
        "getBytes32Properties(address)": FunctionFragment
        "getDecimal(address)": FunctionFragment
        "getInfo(address)": FunctionFragment
        "getInfoBatch(address[])": FunctionFragment
        "getStringProperties(address)": FunctionFragment
        "isContract(address)": FunctionFragment
        "isNFT(address)": FunctionFragment
        "getEnsName(address)": FunctionFragment
    }

    getFunction(
        nameOrSignatureOrTopic:
            | "getBytes32Properties"
            | "getDecimal"
            | "getInfo"
            | "getInfoBatch"
            | "getStringProperties"
            | "isContract"
            | "isNFT"
            | "getEnsName"
    ): FunctionFragment

    encodeFunctionData(
        functionFragment: "getBytes32Properties",
        values: [PromiseOrValue<string>]
    ): string
    encodeFunctionData(
        functionFragment: "getDecimal",
        values: [PromiseOrValue<string>]
    ): string
    encodeFunctionData(
        functionFragment: "getInfo",
        values: [PromiseOrValue<string>]
    ): string
    encodeFunctionData(
        functionFragment: "getInfoBatch",
        values: [PromiseOrValue<string>[]]
    ): string
    encodeFunctionData(
        functionFragment: "getStringProperties",
        values: [PromiseOrValue<string>]
    ): string

    decodeFunctionResult(
        functionFragment: "getBytes32Properties",
        data: BytesLike
    ): Result
    decodeFunctionResult(
        functionFragment: "getDecimal",
        data: BytesLike
    ): Result
    decodeFunctionResult(functionFragment: "getInfo", data: BytesLike): Result
    decodeFunctionResult(
        functionFragment: "getInfoBatch",
        data: BytesLike
    ): Result
    decodeFunctionResult(
        functionFragment: "getStringProperties",
        data: BytesLike
    ): Result
    decodeFunctionResult(
        functionFragment: "isContract",
        data: BytesLike
    ): Boolean
    decodeFunctionResult(functionFragment: "isNFT", data: BytesLike): Boolean
    decodeFunctionResult(
        functionFragment: "getEnsName",
        data: BytesLike
    ): string

    events: {}
}

export interface TokenInfo extends BaseContract {
    connect(signerOrProvider: Signer | Provider | string): this
    attach(addressOrName: string): this
    deployed(): Promise<this>

    interface: TokenInfoInterface

    queryFilter<TEvent extends TypedEvent>(
        event: TypedEventFilter<TEvent>,
        fromBlockOrBlockhash?: string | number | undefined,
        toBlock?: string | number | undefined
    ): Promise<Array<TEvent>>

    listeners<TEvent extends TypedEvent>(
        eventFilter?: TypedEventFilter<TEvent>
    ): Array<TypedListener<TEvent>>
    listeners(eventName?: string): Array<Listener>
    removeAllListeners<TEvent extends TypedEvent>(
        eventFilter: TypedEventFilter<TEvent>
    ): this
    removeAllListeners(eventName?: string): this
    off: OnEvent<this>
    on: OnEvent<this>
    once: OnEvent<this>
    removeListener: OnEvent<this>

    functions: {
        getBytes32Properties(
            token: PromiseOrValue<string>,
            overrides?: CallOverrides
        ): Promise<[string, string] & { symbol: string; name: string }>

        getDecimal(
            token: PromiseOrValue<string>,
            overrides?: CallOverrides
        ): Promise<[BigNumber] & { decimals: BigNumber }>

        getInfo(
            token: PromiseOrValue<string>,
            overrides?: CallOverrides
        ): Promise<
            [TokenInfo.InfoStructOutput] & { info: TokenInfo.InfoStructOutput }
        >

        getInfoBatch(
            tokens: PromiseOrValue<string>[],
            overrides?: CallOverrides
        ): Promise<
            [TokenInfo.InfoStructOutput[]] & {
                infos: TokenInfo.InfoStructOutput[]
            }
        >

        getStringProperties(
            token: PromiseOrValue<string>,
            overrides?: CallOverrides
        ): Promise<[string, string] & { symbol: string; name: string }>

        isContract(
            account: PromiseOrValue<string>,
            overrides?: CallOverrides
        ): Promise<Boolean>

        isNFT(
            account: PromiseOrValue<string>,
            overrides?: CallOverrides
        ): Promise<Boolean>

        getEnsName(
            account: PromiseOrValue<string>,
            overrides?: CallOverrides
        ): Promise<String>
    }

    getBytes32Properties(
        token: PromiseOrValue<string>,
        overrides?: CallOverrides
    ): Promise<[string, string] & { symbol: string; name: string }>

    getDecimal(
        token: PromiseOrValue<string>,
        overrides?: CallOverrides
    ): Promise<BigNumber>

    getInfo(
        token: PromiseOrValue<string>,
        overrides?: CallOverrides
    ): Promise<TokenInfo.InfoStructOutput>

    getInfoBatch(
        tokens: PromiseOrValue<string>[],
        overrides?: CallOverrides
    ): Promise<TokenInfo.InfoStructOutput[]>

    getStringProperties(
        token: PromiseOrValue<string>,
        overrides?: CallOverrides
    ): Promise<[string, string] & { symbol: string; name: string }>

    isContract(
        account: PromiseOrValue<string>,
        overrides?: CallOverrides
    ): Promise<Boolean>

    isNFT(
        account: PromiseOrValue<string>,
        overrides?: CallOverrides
    ): Promise<Boolean>

    getEnsName(
        account: PromiseOrValue<string>,
        overrides?: CallOverrides
    ): Promise<string>

    callStatic: {
        getBytes32Properties(
            token: PromiseOrValue<string>,
            overrides?: CallOverrides
        ): Promise<[string, string] & { symbol: string; name: string }>

        getDecimal(
            token: PromiseOrValue<string>,
            overrides?: CallOverrides
        ): Promise<BigNumber>

        getInfo(
            token: PromiseOrValue<string>,
            overrides?: CallOverrides
        ): Promise<TokenInfo.InfoStructOutput>

        getInfoBatch(
            tokens: PromiseOrValue<string>[],
            overrides?: CallOverrides
        ): Promise<TokenInfo.InfoStructOutput[]>

        getStringProperties(
            token: PromiseOrValue<string>,
            overrides?: CallOverrides
        ): Promise<[string, string] & { symbol: string; name: string }>

        isContract(
            account: PromiseOrValue<string>,
            overrides?: CallOverrides
        ): Promise<Boolean>

        isNFT(
            account: PromiseOrValue<string>,
            overrides?: CallOverrides
        ): Promise<Boolean>

        getEnsName(
            account: PromiseOrValue<string>,
            overrides?: CallOverrides
        ): Promise<string>
    }

    filters: {}

    estimateGas: {
        getBytes32Properties(
            token: PromiseOrValue<string>,
            overrides?: CallOverrides
        ): Promise<BigNumber>

        getDecimal(
            token: PromiseOrValue<string>,
            overrides?: CallOverrides
        ): Promise<BigNumber>

        getInfo(
            token: PromiseOrValue<string>,
            overrides?: CallOverrides
        ): Promise<BigNumber>

        getInfoBatch(
            tokens: PromiseOrValue<string>[],
            overrides?: CallOverrides
        ): Promise<BigNumber>

        getStringProperties(
            token: PromiseOrValue<string>,
            overrides?: CallOverrides
        ): Promise<BigNumber>

        isContract(
            account: PromiseOrValue<string>,
            overrides?: CallOverrides
        ): Promise<BigNumber>

        isNFT(
            account: PromiseOrValue<string>,
            overrides?: CallOverrides
        ): Promise<BigNumber>

        getEnsName(
            account: PromiseOrValue<string>,
            overrides?: CallOverrides
        ): Promise<BigNumber>
    }

    populateTransaction: {
        getBytes32Properties(
            token: PromiseOrValue<string>,
            overrides?: CallOverrides
        ): Promise<PopulatedTransaction>

        getDecimal(
            token: PromiseOrValue<string>,
            overrides?: CallOverrides
        ): Promise<PopulatedTransaction>

        getInfo(
            token: PromiseOrValue<string>,
            overrides?: CallOverrides
        ): Promise<PopulatedTransaction>

        getInfoBatch(
            tokens: PromiseOrValue<string>[],
            overrides?: CallOverrides
        ): Promise<PopulatedTransaction>

        getStringProperties(
            token: PromiseOrValue<string>,
            overrides?: CallOverrides
        ): Promise<PopulatedTransaction>

        isContract(
            account: PromiseOrValue<string>,
            overrides?: CallOverrides
        ): Promise<PopulatedTransaction>

        isNFT(
            account: PromiseOrValue<string>,
            overrides?: CallOverrides
        ): Promise<PopulatedTransaction>

        getEnsName(
            account: PromiseOrValue<string>,
            overrides?: CallOverrides
        ): Promise<PopulatedTransaction>
    }
}
