import { Readable } from "stream";
import { Contracts, Param, Trace, TransactionDetails } from "./transaction";
export interface TracePumlGenerationOptions {
    noGas?: boolean;
    noParams?: boolean;
    noEther?: boolean;
    noTxDetails?: boolean;
    noLogDetails?: boolean;
    noDelegates?: boolean;
    chain?: string;
    depth?: number;
}
export declare const traces2PumlStream: (transactions: TransactionDetails[], traces: Trace[][], contracts: Contracts, options: TracePumlGenerationOptions) => Readable;
export declare const multiTxTraces2PumlStream: (pumlStream: Readable, transactions: TransactionDetails[], traces: Trace[][], contracts: Contracts, options?: TracePumlGenerationOptions) => Readable;
export declare const singleTx2PumlStream: (pumlStream: Readable, transaction: TransactionDetails, traces: Trace[], contracts: Contracts, options: TracePumlGenerationOptions) => Readable;
export declare const writeParticipants: (plantUmlStream: Readable, contracts: Contracts, options?: TracePumlGenerationOptions) => void;
export declare const writeMessages: (plantUmlStream: Readable, traces: Trace[], options?: TracePumlGenerationOptions) => void;
export declare const genParams: (params: Param[], plantUml?: string, indent?: string) => string;
export declare const writeEvents: (plantUmlStream: Readable, contracts: Contracts, options?: TracePumlGenerationOptions) => void;
