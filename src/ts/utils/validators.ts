import {
    ethereumAddress,
    ethereumAddresses,
    transactionHash,
    transactionHashes,
} from "./regEx"
import { InvalidArgumentError, InvalidOptionArgumentError } from "commander"
import { getAddress } from "ethers/lib/utils"

// Validate transaction hashes
export const validateHashes = (hashes: string): string[] => {
    if (hashes?.match(transactionHash)) return [hashes]
    if (hashes?.match(transactionHashes)) return hashes.split(",")

    throw new InvalidArgumentError(
        `Must pass a transaction hash or an array of hashes in hexadecimal format with a 0x prefix.
If running for multiple transactions, the comma-separated list of transaction hashes must not have white spaces.`
    )
}

export const validateAddress = (address: string): string => {
    if (typeof address === "string" && address?.match(ethereumAddress))
        return getAddress(address)

    throw new InvalidArgumentError(
        `Address must be in hexadecimal format with a 0x prefix.`
    )
}

export const validateAddresses = (addresses: string): string[] => {
    try {
        if (typeof addresses === "string" && addresses?.match(ethereumAddress))
            return [getAddress(addresses)]
        if (
            typeof addresses === "string" &&
            addresses?.match(ethereumAddresses)
        )
            return addresses.split(",").map(a => getAddress(a))
    } catch (err) {}

    throw new InvalidArgumentError(
        `Must be address or an array of addresses in hexadecimal format with a 0x prefix.
If running for multiple addresses, the comma-separated list of addresses must not have white spaces.`
    )
}

export const validateDepth = (depthStr: string): number => {
    try {
        const depth = parseInt(depthStr, 10)
        if (depth >= 0) return depth
    } catch (err) {}
    throw new InvalidOptionArgumentError(
        `Invalid depth "${depthStr}". Must be a zero or a positive integer.`
    )
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
