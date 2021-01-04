import { Contract, Networks, Token } from "./transaction";
export default class EtherscanClient {
    readonly apiKey: string;
    readonly network: Networks;
    readonly url: string;
    constructor(apiKey?: string, network?: Networks);
    getContract(contractAddress: string): Promise<Contract>;
    getToken(contractAddress: string): Promise<Token | null>;
}
