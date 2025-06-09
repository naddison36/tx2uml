import { BigNumberish, Signer } from "ethers";
import { JsonRpcProvider } from "@ethersproject/providers";
import { TokenDetails, Trace, TransactionDetails, Transfer } from "../types/tx2umlTypes";
import { Log } from "@ethersproject/abstract-provider";
export default abstract class EthereumNodeClient {
    readonly url: string;
    readonly network: string;
    readonly ethersProvider: JsonRpcProvider;
    private tokenInfoAddress;
    constructor(url: string, network: string);
    abstract getTransactionTrace(txHash: string): Promise<Trace[]>;
    abstract getTransactionError(tx: TransactionDetails): Promise<string>;
    getTransactionDetails(txHash: string): Promise<TransactionDetails>;
    getTokenDetails(contractAddresses: string[]): Promise<TokenDetails[]>;
    static parseTransferEvents(logs: Array<Log>): Transfer[];
    getProxyImplementation: (address: string, block: number) => Promise<string>;
    impersonate(address: string, fund?: boolean): Promise<Signer>;
    setBalance(address: string, balance: BigNumberish): Promise<void>;
}
