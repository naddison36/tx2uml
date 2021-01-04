import { BigNumber, BigNumberish } from "ethers"

export const EthersMatchers = {
    toEqualBN(received: BigNumber, expected: BigNumberish) {
        if (!(received instanceof BigNumber)) {
            return {
                message: () => `expected ${received} to be an Ethers BigNumber`,
                pass: false,
            }
            // throw(TypeError(`Failed toEqualBN as received "${received}" was not an Ethers BigNumber`));
        }
        const expectedBN = BigNumber.from(expected)
        const pass = received.eq(expectedBN)
        if (pass) {
            return {
                message: () =>
                    `expected ${received} not to equal Ethers BigNumber ${expectedBN}`,
                pass: true,
            }
        } else {
            return {
                message: () =>
                    `expected ${received} to equal Ethers BigNumber ${expectedBN}`,
                pass: false,
            }
        }
    },
    toBeGreaterThanBN(received: BigNumber, expected: BigNumberish) {
        if (!(received instanceof BigNumber)) {
            throw TypeError(
                `Failed toBeGreaterThanBN as received "${received}" was not an Ethers BigNumber`
            )
        }
        const expectedBN = BigNumber.from(expected)
        const pass = received.gt(expectedBN)
        if (pass) {
            return {
                message: () =>
                    `expected ${received} not to be greater than Ethers BigNumber ${expectedBN}`,
                pass: true,
            }
        } else {
            return {
                message: () =>
                    `expected ${received} to be greater than Ethers BigNumber ${expectedBN}`,
                pass: false,
            }
        }
    },
    toBeLessThanBN(received: BigNumber, expected: BigNumberish) {
        if (!(received instanceof BigNumber)) {
            throw TypeError(
                `Failed toBeGreaterThanBN as received "${received}" was not an Ethers BigNumber`
            )
        }
        const expectedBN = BigNumber.from(expected)
        const pass = received.lt(expectedBN)
        if (pass) {
            return {
                message: () =>
                    `expected ${received} not to be less than Ethers BigNumber ${expectedBN}`,
                pass: true,
            }
        } else {
            return {
                message: () =>
                    `expected ${received} to be less than Ethers BigNumber ${expectedBN}`,
                pass: false,
            }
        }
    },
}

declare global {
    namespace jest {
        interface Matchers<R, T> {
            toEqualBN(expected: BigNumberish): R
            toBeGreaterThanBN(expected: BigNumberish): R
            toBeLessThanBN(expected: BigNumberish): R
        }
    }
}
