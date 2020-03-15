import { Message, Networks, Token, TokenTransfer, TransactionDetails } from "./transaction";
export declare const getTransactionDetails: (txHash: string, apiKey?: string, network?: Networks) => Promise<[TransactionDetails, Message]>;
export declare const getContractMessages: (txHash: string, apiKey?: string, network?: Networks) => Promise<Message[]>;
export declare const getToken: (contractAddress: string, apiKey?: string, network?: Networks) => Promise<Token>;
export declare const getTokenTransfers: (txHash: string, apiKey?: string, network?: Networks) => Promise<TokenTransfer[]>;
export declare const getEtherTransfers: (txHash: string, apiKey?: string, network?: Networks) => Promise<Message[]>;
export declare const getTransfers: (txHash: string, apiKey?: string, network?: Networks) => Promise<(Message | TokenTransfer)[]>;
