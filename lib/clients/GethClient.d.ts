import { Trace, TransactionDetails } from "../transaction";
import EthereumNodeClient from "./EthereumNodeClient";
export declare type CallResponse = {
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
    calls?: CallResponse[];
};
export default class GethClient extends EthereumNodeClient {
    readonly url: string;
    readonly chain: string;
    private jsonRpcId;
    constructor(url?: string, chain?: string);
    getTransactionTrace(txHash: string): Promise<Trace[]>;
    getTransactionError(tx: TransactionDetails): Promise<string>;
}
export declare const parseReasonCode: (messageData: string) => string;
