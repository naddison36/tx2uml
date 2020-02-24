import { Message, Networks, Token, TransactionDetails } from "./transaction";
export declare const getTransactionDetails: (txHash: string, apiKey?: string, network?: Networks) => Promise<[TransactionDetails, Message]>;
export declare const getContractMessages: (txHash: string, apiKey?: string, network?: Networks) => Promise<Message[]>;
export declare const getToken: (contractAddress: string, apiKey?: string, network?: Networks) => Promise<Token>;
