import { BigNumberish } from "ethers";
export declare const participantId: (address: string) => string;
export declare const shortAddress: (address: string) => string;
export declare const shortBytes: (bytes: string, wrapLength?: number) => string;
export declare const shortTokenId: (tokenId: BigNumberish) => string;
export declare const formatNumber: (value: string) => string;
export declare const convertBytes32ToString: (output: string) => string;
export declare const escapeCarriageReturns: (str: string) => string;
