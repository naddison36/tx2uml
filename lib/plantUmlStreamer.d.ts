/// <reference types="node" />
import { Contracts, Message, Param, TokenTransfer, TransactionInfo } from "./transaction";
import { Readable } from "stream";
export interface PumlGenerationOptions {
    gas?: boolean;
    params?: boolean;
    ether?: boolean;
    network?: string;
}
export declare const streamTransferPuml: (txHash: string, transfers: (Message | TokenTransfer)[], contracts: Contracts, options?: PumlGenerationOptions) => Readable;
export declare const streamTxPlantUml: (transactions: TransactionInfo | TransactionInfo[], contracts: Contracts, options?: PumlGenerationOptions) => Readable;
export declare const streamMultiTxsPuml: (pumlStream: Readable, transactions: TransactionInfo[], contracts: Contracts, options?: PumlGenerationOptions) => Readable;
export declare const streamSingleTxPuml: (pumlStream: Readable, transaction: TransactionInfo, contracts: Contracts, options?: PumlGenerationOptions) => Readable;
export declare const writeParticipants: (plantUmlStream: Readable, contracts: Contracts) => void;
export declare const participantId: (address: string) => string;
export declare const shortAddress: (address: string) => string;
export declare const writeMessages: (plantUmlStream: Readable, messages: Message[], options?: PumlGenerationOptions) => void;
export declare const genParams: (params: Param[], plantUml?: string) => string;
export declare const writeTransfers: (plantUmlStream: Readable, transfers: (Message | TokenTransfer)[], options?: PumlGenerationOptions) => void;
