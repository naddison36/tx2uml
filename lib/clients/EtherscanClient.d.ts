import { Contract, Network, Token } from "../types/tx2umlTypes";
export default class EtherscanClient {
    readonly apiKey: string;
    readonly network: Network;
    readonly url: string;
    constructor(apiKey?: string, network?: Network);
    getContract(contractAddress: string): Promise<Contract>;
    getToken(contractAddress: string): Promise<Token | null>;
}
