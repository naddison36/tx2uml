import { bytes, ethereumAddress } from "./regEx"
import { parseBytes32String } from "ethers/lib/utils"

export const participantId = (address: string): string => {
    if (!address) return ""
    const participantId = address.substr(2, 4) + address.substr(-4, 4)
    return participantId.toLocaleLowerCase()
}

export const shortAddress = (address: string): string => {
    if (typeof address !== "string") return ""
    if (!address.match(ethereumAddress)) return address
    return address.substr(0, 6) + ".." + address.substr(-4, 4)
}

// Replaces zero padding (5 or more 0) with 0..0. eg the following
// 0xc9f12e9d000000000000000000000000dc7d8cc3a22fe0ec69770e02931f43451b7b975e000000000000000000000000178c820f862b14f316509ec36b13123da19a6054
// becomes
// 0xc9f12e9d0..0dc7d8cc3a22fe0ec69770e02931f43451b7b975e0..0178c820f862b14f316509ec36b13123da19a6054
export const shortBytes = (bytes: string, wrapLength = 66): string => {
    if (!bytes) return ""
    if (typeof bytes !== "string") return bytes
    // replace 5 or more zeros
    const noZeroPadding = bytes.replace(/0{5,}/g, "0..0")
    // split the data up into wrapLength strings
    const splitData = noZeroPadding.match(
        new RegExp(".{1," + wrapLength + "}", "g")
    )
    // Join the split data strings back with a carrage return
    const wrappedString = splitData.reduce((accumulator, currentValue) => {
        return accumulator + "\\n" + currentValue
    })
    return wrappedString
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
