/// <reference types="node" />
import { Readable } from "stream";
import { Contracts, Param, Trace, TransactionDetails } from "./transaction";
export interface PumlGenerationOptions {
    noGas?: boolean;
    noParams?: boolean;
    noEther?: boolean;
    noTxDetails?: boolean;
    network?: string;
}
export declare const streamTxPlantUml: (transactions: TransactionDetails[], traces: Trace[][], contracts: Contracts, options?: PumlGenerationOptions) => Readable;
export declare const streamMultiTxsPuml: (pumlStream: Readable, transactions: TransactionDetails[], traces: Trace[][], contracts: Contracts, options?: PumlGenerationOptions) => Readable;
export declare const streamSingleTxPuml: (pumlStream: Readable, transaction: TransactionDetails, traces: Trace[], contracts: Contracts, options?: PumlGenerationOptions) => Readable;
export declare const writeParticipants: (plantUmlStream: Readable, contracts: Contracts) => void;
export declare const writeMessages: (plantUmlStream: Readable, traces: Trace[], options?: PumlGenerationOptions) => void;
export declare const genParams: (params: Param[], plantUml?: string, indent?: string) => string;
