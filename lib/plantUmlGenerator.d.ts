import { Contracts, Message, Param, TransactionDetails } from "./transaction";
export interface PumlGenerationOptions {
    gas?: boolean;
    params?: boolean;
    network?: string;
}
export declare const genPlantUml: (messages: Message[], contracts: Contracts, details: TransactionDetails, options?: PumlGenerationOptions) => string;
export declare const genParticipants: (contracts: Contracts) => string;
export declare const participantId: (address: string) => string;
export declare const shortAddress: (address: string) => string;
export declare const genMessages: (messages: Message[], options?: PumlGenerationOptions) => string;
export declare const genParams: (params: Param[]) => string;
