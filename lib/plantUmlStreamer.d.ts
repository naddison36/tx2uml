/// <reference types="node" />
import { Contracts, Message, Param, TransactionDetails } from "./transaction";
import { Readable } from "stream";
export interface PumlGenerationOptions {
    gas?: boolean;
    params?: boolean;
    network?: string;
}
export declare const streamPlantUml: (messages: Message[], contracts: Contracts, details: TransactionDetails, options?: PumlGenerationOptions) => Readable;
export declare const writeParticipants: (plantUmlStream: Readable, contracts: Contracts) => void;
export declare const participantId: (address: string) => string;
export declare const shortAddress: (address: string) => string;
export declare const writeMessages: (plantUmlStream: Readable, messages: Message[], options?: PumlGenerationOptions) => void;
export declare const genParams: (params: Param[]) => string;
