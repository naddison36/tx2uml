import { BigNumber, BigNumberish } from "ethers";
export declare const EthersMatchers: {
    toEqualBN(received: BigNumber, expected: BigNumberish): {
        message: () => string;
        pass: boolean;
    };
    toBeGreaterThanBN(received: BigNumber, expected: BigNumberish): {
        message: () => string;
        pass: boolean;
    };
    toBeLessThanBN(received: BigNumber, expected: BigNumberish): {
        message: () => string;
        pass: boolean;
    };
};
declare global {
    namespace jest {
        interface Matchers<R, T> {
            toEqualBN(expected: BigNumberish): R;
            toBeGreaterThanBN(expected: BigNumberish): R;
            toBeLessThanBN(expected: BigNumberish): R;
        }
    }
}
