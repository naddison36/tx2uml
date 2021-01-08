import { providers } from "ethers";
import { Provider } from "ethers-multicall";
import { Trace, TransactionDetails } from "../transaction";
import EthereumNodeClient from "./EthereumNodeClient";
export declare type TraceResponse = {
    type: "call" | "suicide" | "create";
    action: {
        callType?: "call" | "delegatecall" | "staticcall";
        from?: string;
        to?: string;
        input?: string;
        gas?: string;
        value?: string;
        creationMethod?: "create";
        init?: string;
        address?: string;
        balance?: string;
        refundAddress?: string;
    };
    result?: {
        gasUsed: string;
        output: string;
        address?: string;
        code?: string;
        init?: string;
    } | null;
    subtraces: number;
    traceAddress: number[];
    error?: string;
};
export default class OpenEthereumClient extends EthereumNodeClient {
    readonly url: string;
    readonly network: string;
    readonly ethersProvider: providers.JsonRpcProvider;
    readonly multicallProvider: Provider;
    private jsonRpcId;
    constructor(url?: string, network?: string);
    getTransactionTrace(txHash: string): Promise<Trace[]>;
    getTransactionError(tx: TransactionDetails): Promise<string>;
}
