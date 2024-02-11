/// <reference types="node" />
import { Readable } from "stream";
import { Network, ParticipantPositions, Participants, TransactionDetails, Transfer, TransferPumlGenerationOptions } from "./types/tx2umlTypes";
export declare const transfers2PumlStream: (transactions: readonly Readonly<TransactionDetails>[], transfers: readonly Readonly<Transfer>[][], participants: Readonly<Participants>, network: Network, options?: TransferPumlGenerationOptions) => Readable;
export declare const multiTransfers2PumlStream: (pumlStream: Readable, transactions: readonly TransactionDetails[], transfers: readonly Transfer[][], participants: Readonly<Participants>, options?: TransferPumlGenerationOptions) => Readable;
export declare const singleTransfer2PumlStream: (pumlStream: Readable, transaction: Readonly<TransactionDetails>, transfers: readonly Transfer[], participants: Readonly<Participants>, options?: TransferPumlGenerationOptions) => Readable;
export declare const writeParticipants: (plantUmlStream: Readable, participants: Readonly<Participants>) => void;
export declare const writeMessages: (plantUmlStream: Readable, transfers: readonly Transfer[]) => void;
export declare const writeBalances: (plantUmlStream: Readable, participantBalances: ParticipantPositions, participants: Readonly<Participants>) => void;
