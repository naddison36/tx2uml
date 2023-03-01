import { Trace, TransactionDetails, Transfer } from "../types/tx2umlTypes";
import EthereumNodeClient from "./EthereumNodeClient";
export type CallTracerResponse = {
    type: "CALL" | "CALLCODE" | "CREATE" | "CREATE2" | "DELEGATECALL" | "SELFDESTRUCT" | "STATICCALL";
    from?: string;
    to?: string;
    input?: string;
    output?: string;
    value?: string;
    gas?: string;
    gasUsed?: string;
    time?: string;
    error?: string;
    calls?: CallTracerResponse[];
};
export type CallTransferResponse = {
    from: string;
    to: string;
    tokenAddress?: string;
    value: string;
    pc: number;
    event?: string;
};
export default class GethClient extends EthereumNodeClient {
    readonly url: string;
    private jsonRpcId;
    constructor(url?: string);
    getTransactionTrace(txHash: string): Promise<Trace[]>;
    getValueTransfers(txHash: string): Promise<Transfer[]>;
    getTransactionError(tx: TransactionDetails): Promise<string>;
}
export declare const parseReasonCode: (messageData: string) => string;
