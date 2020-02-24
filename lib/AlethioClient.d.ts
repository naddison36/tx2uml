import { Message, Networks, TransactionDetails } from "./transaction";
export declare const getTransactionDetails: (txHash: string, apiKey?: string, network?: Networks) => Promise<[TransactionDetails, Message]>;
export declare const getContractMessages: (txHash: string, apiKey?: string, network?: Networks) => Promise<Message[]>;
