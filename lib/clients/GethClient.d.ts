import { Trace } from "../transaction";
import { ITracingClient } from "./index";
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
export default class GethClient implements ITracingClient {
    readonly url: string;
    readonly network: string;
    private jsonRpcId;
    constructor(url?: string, network?: string);
    getTransactionTrace(txHash: string): Promise<Trace[]>;
}
