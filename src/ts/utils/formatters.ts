import { bytes, ethereumAddress } from "./regEx"
import { parseBytes32String } from "ethers/lib/utils"
import { BigNumber, BigNumberish } from "ethers"

export const participantId = (address: string): string => {
    if (!address) return ""
    const participantId = address.slice(2, 6) + address.slice(-4)
    return participantId.toLocaleLowerCase()
}

export const shortAddress = (address: string): string => {
    if (typeof address !== "string") return ""
    if (!address.match(ethereumAddress)) return address
    return address.slice(0, 6) + ".." + address.slice(-4)
}

export const shortBytes = (bytes: string, wrapLength = 66): string => {
    if (!bytes) return ""
    if (typeof bytes !== "string") return bytes
    if (bytes.length <= 18) return bytes
    return bytes.slice(0, 10) + ".." + bytes.slice(-8)
}

export const shortTokenId = (tokenId: BigNumberish): string => {
    const id = BigNumber.from(tokenId).toString()
    if (id.length <= 6) return tokenId.toString()
    return id.slice(0, 3) + ".." + id.slice(-3)
}

// Adds thousands commas and a double comma after the 18th digit from the left.
export const formatNumber = (value: string): string => {
    if (!value) return ""
    if (!value.toString().match(/^\d+$/)) return value
    const thousandsCommas = value
        .toString()
        .replace(/\B(?=(\d{3})+(?!\d))/g, ",")
    if (thousandsCommas.length > 24) {
        const doubleCommonPosition = thousandsCommas.length - 24
        return (
            thousandsCommas.substr(0, doubleCommonPosition + 1) +
            thousandsCommas.substr(doubleCommonPosition)
        )
    }
    return thousandsCommas
}

export const convertBytes32ToString = (output: string) => {
    if (!output || typeof output !== "string") return undefined
    return output.match(bytes) ? parseBytes32String(output) : output
}
