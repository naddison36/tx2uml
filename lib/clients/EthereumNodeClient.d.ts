import { Provider } from "@ethersproject/providers";
import { Network, TokenDetails, Trace, TransactionDetails, Transfer } from "../transaction";
import { Log } from "@ethersproject/abstract-provider";
export default abstract class EthereumNodeClient {
    readonly url: string;
    readonly network: Network;
    readonly ethersProvider: Provider;
    private tokenInfoAddress;
    constructor(url?: string, network?: Network);
    abstract getTransactionTrace(txHash: string): Promise<Trace[]>;
    abstract getTransactionError(tx: TransactionDetails): Promise<string>;
    getTransactionDetails(txHash: string): Promise<TransactionDetails>;
    getTokenDetails(contractAddresses: string[]): Promise<TokenDetails[]>;
    static parseTransferEvents(logs: Array<Log>): Transfer[];
}
