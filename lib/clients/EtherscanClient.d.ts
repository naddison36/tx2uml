import { Contract, Network } from "../types/tx2umlTypes";
export default class EtherscanClient {
    readonly apiKey?: string;
    readonly url: string;
    constructor(apiKey?: string, network?: Network, url?: string);
    getContract(contractAddress: string): Promise<Contract>;
}
