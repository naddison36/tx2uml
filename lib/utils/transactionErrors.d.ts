import { Provider, TransactionReceipt } from "@ethersproject/providers";
import { TransactionResponse } from "@ethersproject/abstract-provider";
export declare const getTransactionError: (tx: TransactionResponse, receipt: TransactionReceipt, provider: Provider) => Promise<string>;
export declare const parseReasonCode: (messageData: string) => string;
