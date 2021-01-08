import { Contract as EthersContract } from "ethers";
import { Provider as EthersProvider } from "@ethersproject/providers";
import { Provider } from "ethers-multicall";
import { TokenDetails, Trace, TransactionDetails } from "../transaction";
export default abstract class EthereumNodeClient {
    readonly url: string;
    readonly network: string;
    readonly ethersProvider: EthersProvider;
    readonly multicallProvider: Provider;
    constructor(url?: string, network?: string);
    abstract getTransactionTrace(txHash: string): Promise<Trace[]>;
    abstract getTransactionError(tx: TransactionDetails): Promise<string>;
    getTransactionDetails(txHash: string): Promise<TransactionDetails>;
    getTokenDetailsKnownABI(contract: EthersContract): Promise<TokenDetails>;
    getTokenDetailsUnknownABI(address: string): Promise<TokenDetails>;
    private _getTokenDetails;
}
