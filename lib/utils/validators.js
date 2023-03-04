"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseFilename = exports.validateDepth = exports.validateAddresses = exports.validateAddress = exports.validateHashes = void 0;
const regEx_1 = require("./regEx");
const commander_1 = require("commander");
const utils_1 = require("ethers/lib/utils");
// Validate transaction hashes
const validateHashes = (hashes) => {
    if (hashes?.match(regEx_1.transactionHash))
        return [hashes];
    if (hashes?.match(regEx_1.transactionHashes))
        return hashes.split(",");
    throw new commander_1.InvalidArgumentError(`Must pass a transaction hash or an array of hashes in hexadecimal format with a 0x prefix.
If running for multiple transactions, the comma-separated list of transaction hashes must not have white spaces.`);
};
exports.validateHashes = validateHashes;
const validateAddress = (address) => {
    if (typeof address === "string" && address?.match(regEx_1.ethereumAddress))
        return (0, utils_1.getAddress)(address);
    throw new commander_1.InvalidArgumentError(`Address must be in hexadecimal format with a 0x prefix.`);
};
exports.validateAddress = validateAddress;
const validateAddresses = (addresses) => {
    try {
        if (typeof addresses === "string" && addresses?.match(regEx_1.ethereumAddress))
            return [(0, utils_1.getAddress)(addresses)];
        if (typeof addresses === "string" &&
            addresses?.match(regEx_1.ethereumAddresses))
            return addresses.split(",").map(a => (0, utils_1.getAddress)(a));
    }
    catch (err) { }
    throw new commander_1.InvalidArgumentError(`Must be address or an array of addresses in hexadecimal format with a 0x prefix.
If running for multiple addresses, the comma-separated list of addresses must not have white spaces.`);
};
exports.validateAddresses = validateAddresses;
const validateDepth = (depthStr) => {
    try {
        const depth = parseInt(depthStr, 10);
        if (depth >= 0)
            return depth;
    }
    catch (err) { }
    throw new commander_1.InvalidOptionArgumentError(`Invalid depth "${depthStr}". Must be a zero or a positive integer.`);
};
exports.validateDepth = validateDepth;
const parseFilename = (outputFileName, hashes) => {
    if (outputFileName)
        return outputFileName;
    try {
        // Take the first 4 and last 4 characters of each hash
        return hashes.reduce((filename, hash) => filename + hash.slice(2, 6) + hash.slice(62, 66), "");
    }
    catch (err) {
        throw new commander_1.InvalidOptionArgumentError(`Invalid outputFileName option "${outputFileName}".`);
    }
};
exports.parseFilename = parseFilename;
//# sourceMappingURL=validators.js.map