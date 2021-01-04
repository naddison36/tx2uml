"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EthersMatchers = void 0;
const ethers_1 = require("ethers");
exports.EthersMatchers = {
    toEqualBN(received, expected) {
        if (!(received instanceof ethers_1.BigNumber)) {
            return {
                message: () => `expected ${received} to be an Ethers BigNumber`,
                pass: false,
            };
            // throw(TypeError(`Failed toEqualBN as received "${received}" was not an Ethers BigNumber`));
        }
        const expectedBN = ethers_1.BigNumber.from(expected);
        const pass = received.eq(expectedBN);
        if (pass) {
            return {
                message: () => `expected ${received} not to equal Ethers BigNumber ${expectedBN}`,
                pass: true,
            };
        }
        else {
            return {
                message: () => `expected ${received} to equal Ethers BigNumber ${expectedBN}`,
                pass: false,
            };
        }
    },
    toBeGreaterThanBN(received, expected) {
        if (!(received instanceof ethers_1.BigNumber)) {
            throw TypeError(`Failed toBeGreaterThanBN as received "${received}" was not an Ethers BigNumber`);
        }
        const expectedBN = ethers_1.BigNumber.from(expected);
        const pass = received.gt(expectedBN);
        if (pass) {
            return {
                message: () => `expected ${received} not to be greater than Ethers BigNumber ${expectedBN}`,
                pass: true,
            };
        }
        else {
            return {
                message: () => `expected ${received} to be greater than Ethers BigNumber ${expectedBN}`,
                pass: false,
            };
        }
    },
    toBeLessThanBN(received, expected) {
        if (!(received instanceof ethers_1.BigNumber)) {
            throw TypeError(`Failed toBeGreaterThanBN as received "${received}" was not an Ethers BigNumber`);
        }
        const expectedBN = ethers_1.BigNumber.from(expected);
        const pass = received.lt(expectedBN);
        if (pass) {
            return {
                message: () => `expected ${received} not to be less than Ethers BigNumber ${expectedBN}`,
                pass: true,
            };
        }
        else {
            return {
                message: () => `expected ${received} to be less than Ethers BigNumber ${expectedBN}`,
                pass: false,
            };
        }
    },
};
//# sourceMappingURL=jest.js.map