import { Provider } from "@ethersproject/providers";
import { Log } from "@ethersproject/abstract-provider";
import { TokenDetails, Trace, TransactionDetails, Transfer } from "../transaction";
export default abstract class EthereumNodeClient {
    readonly url: string;
    readonly ethersProvider: Provider;
    constructor(url?: string);
    abstract getTransactionTrace(txHash: string): Promise<Trace[]>;
    abstract getTransactionError(tx: TransactionDetails): Promise<string>;
    getTransactionDetails(txHash: string): Promise<TransactionDetails>;
    getTokenDetails(contractAddresses: string[]): Promise<TokenDetails[]>;
    static parseTransferEvents(logs: Array<Log>): Transfer[];
}
