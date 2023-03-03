"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseFilename = exports.validateDepth = exports.validateAddresses = exports.validateHashes = void 0;
const regEx_1 = require("./regEx");
const commander_1 = require("commander");
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
const validateAddresses = (addresses) => {
    if (addresses?.match(regEx_1.ethereumAddresses))
        return [addresses];
    if (addresses?.match(regEx_1.ethereumAddresses))
        return addresses.split(",");
    throw new commander_1.InvalidArgumentError(`Must be address or an array of addresses in hexadecimal format with a 0x prefix.
If running for multiple addresses, the comma-separated list of addresses must not have white spaces.`);
};
exports.validateAddresses = validateAddresses;
const validateDepth = (depthStr) => {
    try {
        return parseInt(depthStr, 10);
    }
    catch (err) {
        throw new commander_1.InvalidOptionArgumentError(`Invalid depth "${depthStr}". Must be an integer.`);
    }
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