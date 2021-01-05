import { Contract as EthersContract, providers } from "ethers";
import { Provider } from "ethers-multicall";
import { TokenDetails, TransactionDetails } from "../transaction";
export default class EthereumNodeClient {
    readonly url: string;
    readonly network: string;
    readonly ethersProvider: providers.JsonRpcProvider;
    readonly multicallProvider: Provider;
    constructor(url?: string, network?: string);
    getTransactionDetails(txHash: string): Promise<TransactionDetails>;
    getTokenDetailsKnownABI(contract: EthersContract): Promise<TokenDetails>;
    getTokenDetailsUnknownABI(address: string): Promise<TokenDetails>;
    private _getTokenDetails;
}
