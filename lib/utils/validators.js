"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseFilename = exports.validateDepth = exports.validateMappedAddresses = exports.validateAddresses = exports.validateAddress = exports.validateHashes = void 0;
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
    try {
        if (typeof address === "string" && address?.match(regEx_1.ethereumAddress))
            return (0, utils_1.getAddress)(address);
    }
    catch (err) { }
    throw new commander_1.InvalidArgumentError(`Address must be in hexadecimal format with a 0x prefix.`);
};
exports.validateAddress = validateAddress;
const validateAddresses = (addresses) => {
    try {
        const addressArray = convertAddresses(addresses);
        if (addressArray)
            return addressArray;
    }
    catch (err) { }
    throw new commander_1.InvalidArgumentError(`Must be an address or an array of addresses in hexadecimal format with a 0x prefix.
If running for multiple addresses, the comma-separated list of addresses must not have white spaces.`);
};
exports.validateAddresses = validateAddresses;
const validateMappedAddresses = (addresses) => {
    try {
        const contractSourceAddresses = addresses.split(":");
        if (contractSourceAddresses.length !== 2) {
            throw new commander_1.InvalidArgumentError(`The comma-separated list of addresses must be split by a colon (:).`);
        }
        const contracts = convertAddresses(contractSourceAddresses[0]);
        if (!contracts)
            throw new commander_1.InvalidArgumentError(`The contracts to be mapped on the left of the colon (:) must be an address or a comma-separated list of addresses in hexadecimal format with a 0x prefix.`);
        const sources = convertAddresses(contractSourceAddresses[1]);
        if (!sources)
            throw new commander_1.InvalidArgumentError(`Source contracts to the right of the colon (:) must be an address or a comma-separated list of addresses in hexadecimal format with a 0x prefix.`);
        if (contracts.length != sources.length) {
            throw new commander_1.InvalidArgumentError(`The number of contracts to be mapped does not match the verified contracts.
${contracts.length} contracts to be mapped and ${sources.length} verified contracts.`);
        }
        return contracts.map((contractAddress, i) => {
            return {
                contract: contractAddress,
                source: sources[i],
            };
        });
    }
    catch (err) {
        if (err instanceof commander_1.InvalidArgumentError) {
            throw err;
        }
    }
    throw new commander_1.InvalidArgumentError(`Must be an address or an array of addresses in hexadecimal format with a 0x prefix.
If running for multiple addresses, the comma-separated list of addresses must not have white spaces.`);
};
exports.validateMappedAddresses = validateMappedAddresses;
const convertAddresses = (addresses) => {
    if (typeof addresses === "string" && addresses?.match(regEx_1.ethereumAddress))
        return [(0, utils_1.getAddress)(addresses).toLowerCase()];
    if (typeof addresses === "string" && addresses?.match(regEx_1.ethereumAddresses))
        return addresses.split(",").map(a => (0, utils_1.getAddress)(a).toLowerCase());
    return undefined;
};
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
const parseFilename = (outputFileName, hashes, value = false) => {
    if (outputFileName)
        return outputFileName;
    try {
        // Take the first 4 and last 4 characters of each hash
        const compressedHashes = hashes.reduce((filename, hash) => filename + hash.slice(2, 6) + hash.slice(62, 66), "");
        // Prefix a v for value transfer diagrams
        return value ? "v" + compressedHashes : compressedHashes;
    }
    catch (err) {
        throw new commander_1.InvalidOptionArgumentError(`Invalid outputFileName option "${outputFileName}".`);
    }
};
exports.parseFilename = parseFilename;
//# sourceMappingURL=validators.js.map