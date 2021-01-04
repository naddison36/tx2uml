import { Contract as EthersContract, providers } from "ethers";
import { Provider } from "ethers-multicall";
import { TokenDetails, Trace, TransactionDetails } from "./transaction";
export declare type TraceResponse = {
    type: "call" | "suicide" | "create";
    action: {
        callType?: "call" | "delegatecall" | "staticcall";
        from?: string;
        to?: string;
        input?: string;
        gas?: string;
        value?: string;
        creationMethod?: "create";
        init?: string;
        address?: string;
        balance?: string;
        refundAddress?: string;
    };
    result?: {
        gasUsed: string;
        output: string;
        address?: string;
        code?: string;
        init?: string;
    } | null;
    subtraces: number;
    traceAddress: number[];
    error?: string;
};
export default class OpenEthereumClient {
    readonly url: string;
    readonly network: string;
    readonly ethersProvider: providers.JsonRpcProvider;
    readonly multicallProvider: Provider;
    private jsonRpcId;
    constructor(url?: string, network?: string);
    getTransactionDetails(txHash: string): Promise<TransactionDetails>;
    getTokenDetailsKnownABI(contract: EthersContract): Promise<TokenDetails>;
    getTokenDetailsUnknownABI(address: string): Promise<TokenDetails>;
    private _getTokenDetails;
    getTransactionTrace(txHash: string): Promise<Trace[]>;
}
