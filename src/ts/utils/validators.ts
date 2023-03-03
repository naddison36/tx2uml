import { ethereumAddresses, transactionHash, transactionHashes } from "./regEx"
import { InvalidArgumentError, InvalidOptionArgumentError } from "commander"

// Validate transaction hashes
export const validateHashes = (hashes: string): string[] => {
    if (hashes?.match(transactionHash)) return [hashes]
    if (hashes?.match(transactionHashes)) return hashes.split(",")

    throw new InvalidArgumentError(
        `Must pass a transaction hash or an array of hashes in hexadecimal format with a 0x prefix.
If running for multiple transactions, the comma-separated list of transaction hashes must not have white spaces.`
    )
}

export const validateAddresses = (addresses: string): string[] => {
    if (addresses?.match(ethereumAddresses)) return [addresses]
    if (addresses?.match(ethereumAddresses)) return addresses.split(",")

    throw new InvalidArgumentError(
        `Must be address or an array of addresses in hexadecimal format with a 0x prefix.
If running for multiple addresses, the comma-separated list of addresses must not have white spaces.`
    )
}

export const validateDepth = (depthStr: string): number => {
    try {
        return parseInt(depthStr, 10)
    } catch (err) {
        throw new InvalidOptionArgumentError(
            `Invalid depth "${depthStr}". Must be an integer.`
        )
    }
}

export const parseFilename = (
    outputFileName: string,
    hashes: string[]
): string => {
    if (outputFileName) return outputFileName

    try {
        // Take the first 4 and last 4 characters of each hash
        return hashes.reduce(
            (filename, hash) =>
                filename + hash.slice(2, 6) + hash.slice(62, 66),
            ""
        )
    } catch (err) {
        throw new InvalidOptionArgumentError(
            `Invalid outputFileName option "${outputFileName}".`
        )
    }
}
