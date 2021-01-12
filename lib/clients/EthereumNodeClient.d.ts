import { Provider } from "@ethersproject/providers";
import { TokenDetails, Trace, TransactionDetails } from "../transaction";
export default abstract class EthereumNodeClient {
    readonly url: string;
    readonly network: string;
    readonly ethersProvider: Provider;
    constructor(url?: string, network?: string);
    abstract getTransactionTrace(txHash: string): Promise<Trace[]>;
    abstract getTransactionError(tx: TransactionDetails): Promise<string>;
    getTransactionDetails(txHash: string): Promise<TransactionDetails>;
    getTokenDetails(contractAddresses: string[]): Promise<TokenDetails[]>;
}
