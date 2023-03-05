import { Network, Trace, TransactionDetails } from "../types/tx2umlTypes";
import EthereumNodeClient from "./EthereumNodeClient";
export type TraceResponse = {
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
    readonly network: Network;
    private jsonRpcId;
    constructor(url?: string, network?: Network);
    getTransactionTrace(txHash: string): Promise<Trace[]>;
    getTransactionError(tx: TransactionDetails): Promise<string>;
}
