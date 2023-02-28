import { Readable } from "stream";
import { Contracts, TransactionDetails, Transfer } from "./transaction";
import { BigNumber } from "ethers";
export declare const transfers2PumlStream: (transactions: readonly Readonly<TransactionDetails>[], transfers: readonly Readonly<Transfer>[][], contracts: Readonly<Contracts>) => Readable;
export declare const multiTransfers2PumlStream: (pumlStream: Readable, transactions: readonly TransactionDetails[], transfers: readonly Transfer[][], contracts: Readonly<Contracts>) => Readable;
export declare const singleTransfer2PumlStream: (pumlStream: Readable, transaction: Readonly<TransactionDetails>, transfers: readonly Transfer[], contracts: Readonly<Contracts>) => Readable;
declare type ParticipantPositions = {
    [address: string]: {
        [address: string]: BigNumber;
    };
};
export declare const writeParticipants: (plantUmlStream: Readable, contracts: Readonly<Contracts>) => void;
export declare const writeMessages: (plantUmlStream: Readable, transfers: readonly Transfer[]) => void;
export declare const writeBalances: (plantUmlStream: Readable, participantBalances: ParticipantPositions, contracts: Contracts) => void;
export {};
