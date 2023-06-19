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
    try {
        if (typeof address === "string" && address?.match(ethereumAddress))
            return getAddress(address)
    } catch (err) {}

    throw new InvalidArgumentError(
        `Address must be in hexadecimal format with a 0x prefix.`
    )
}

export const validateAddresses = (addresses: string): string[] => {
    try {
        const addressArray = convertAddresses(addresses)
        if (addressArray) return addressArray
    } catch (err) {}

    throw new InvalidArgumentError(
        `Must be an address or an array of addresses in hexadecimal format with a 0x prefix.
If running for multiple addresses, the comma-separated list of addresses must not have white spaces.`
    )
}

export const validateMappedAddresses = (
    addresses: string
): { contract: string; source: string }[] => {
    try {
        const contractSourceAddresses = addresses.split(":")
        if (contractSourceAddresses.length !== 2) {
            throw new InvalidArgumentError(
                `The comma-separated list of addresses must be split by a colon (:).`
            )
        }

        const contracts = convertAddresses(contractSourceAddresses[0])
        if (!contracts)
            throw new InvalidArgumentError(
                `The contracts to be mapped on the left of the colon (:) must be an address or a comma-separated list of addresses in hexadecimal format with a 0x prefix.`
            )
        const sources = convertAddresses(contractSourceAddresses[1])
        if (!sources)
            throw new InvalidArgumentError(
                `Source contracts to the right of the colon (:) must be an address or a comma-separated list of addresses in hexadecimal format with a 0x prefix.`
            )

        if (contracts.length != sources.length) {
            throw new InvalidArgumentError(`The number of contracts to be mapped does not match the verified contracts.
${contracts.length} contracts to be mapped and ${sources.length} verified contracts.`)
        }

        return contracts.map((contractAddress, i) => {
            return {
                contract: contractAddress,
                source: sources[i],
            }
        })
    } catch (err) {
        if (err instanceof InvalidArgumentError) {
            throw err
        }
    }

    throw new InvalidArgumentError(
        `Must be an address or an array of addresses in hexadecimal format with a 0x prefix.
If running for multiple addresses, the comma-separated list of addresses must not have white spaces.`
    )
}

const convertAddresses = (addresses: string): string[] => {
    if (typeof addresses === "string" && addresses?.match(ethereumAddress))
        return [getAddress(addresses).toLowerCase()]
    if (typeof addresses === "string" && addresses?.match(ethereumAddresses))
        return addresses.split(",").map(a => getAddress(a).toLowerCase())
    return undefined
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
    hashes: string[],
    value: boolean = false
): string => {
    if (outputFileName) return outputFileName

    try {
        // Take the first 4 and last 4 characters of each hash
        const compressedHashes = hashes.reduce(
            (filename, hash) =>
                filename + hash.slice(2, 6) + hash.slice(62, 66),
            ""
        )
        // Prefix a v for value transfer diagrams
        return value ? "v" + compressedHashes : compressedHashes
    } catch (err) {
        throw new InvalidOptionArgumentError(
            `Invalid outputFileName option "${outputFileName}".`
        )
    }
}
