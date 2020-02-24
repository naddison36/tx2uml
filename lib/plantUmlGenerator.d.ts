import { Contracts, Message, Param, TransactionDetails } from "./transaction";
export declare const genPlantUml: (messages: Message[], contracts: Contracts, details: TransactionDetails) => string;
export declare const genParticipants: (contracts: Contracts) => string;
export declare const participantId: (address: string) => string;
export declare const shortAddress: (address: string) => string;
export declare const genMessages: (messages: Message[], params?: boolean) => string;
export declare const genParams: (params: Param[]) => string;
