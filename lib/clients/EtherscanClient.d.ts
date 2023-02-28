import { Contract, Network, Token } from "../transaction";
export default class EtherscanClient {
    readonly apiKey: string;
    readonly network: Network;
    readonly url: string;
    constructor(apiKey?: string, network?: Network);
    getContract(contractAddress: string): Promise<Contract>;
    getToken(contractAddress: string): Promise<Token | null>;
}
