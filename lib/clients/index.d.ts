import { Trace } from "../transaction";
export interface ITracingClient {
    getTransactionTrace(txHash: string): Promise<Trace[]>;
}
