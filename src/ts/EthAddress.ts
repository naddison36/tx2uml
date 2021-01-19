import { BigNumber } from "ethers"

export type NumberDigit =
    | "0"
    | "1"
    | "2"
    | "3"
    | "4"
    | "5"
    | "6"
    | "7"
    | "8"
    | "9"
export type HexDigit =
    | NumberDigit
    | "a"
    | "b"
    | "c"
    | "d"
    | "e"
    | "f"
    | "A"
    | "B"
    | "C"
    | "D"
    | "E"
    | "F"
export type EthAddress = `0x${HexDigit[40]}`
export type Bytes32 = `0x${HexDigit[64]}`

export interface Transaction {
    hash: Bytes32
    from: EthAddress
    to: EthAddress
    data: string
    nonce: number
    index: number
    value: BigNumber
    gasPrice: BigNumber
    gasLimit: BigNumber
    gasUsed: BigNumber
    timestamp: Date
    status: boolean
    blockNumber: number
    error?: string
}

const test: HexDigit[2] = "V"
const exampleHash: HexDigit[64] =
    "0x9a946b952621e55922cf1470001e4cd7007fd23f14098aaeefb3574e96c4644zs"
console.log(`Example ${exampleHash} ${test}`)
