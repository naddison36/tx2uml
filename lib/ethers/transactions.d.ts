import { UnsignedTransaction } from "@ethersproject/transactions";
import { SignatureLike } from "@ethersproject/bytes";
export declare function serialize(transaction: UnsignedTransaction, signature?: SignatureLike): string;
