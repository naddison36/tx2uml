import { Contract, Networks } from "./transaction";
export declare const getContract: (contractAddress: string, apiKey?: string, network?: Networks) => Promise<Contract>;
