export const ethereumAddress = /^0x([A-Fa-f0-9]{40})$/
// comma-separated list of addresses with no whitespace
export const ethereumAddresses = /^(0x[A-Fa-f0-9]{40},?)+$/

export const bytes = /^0x([A-Fa-f0-9]{1,})$/
export const bytes4 = /^0x([A-Fa-f0-9]{8})$/
export const bytes32 = /^0x([A-Fa-f0-9]{64})$/
export const bytes64 = /^0x([A-Fa-f0-9]{128})$/
export const transactionHash = bytes32
// one or more comma-separated transaction hashes
export const transactionHashes = /^(0x[A-Fa-f0-9]{64},?)+$/
