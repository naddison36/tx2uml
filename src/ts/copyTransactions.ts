import GethClient from "./clients/GethClient"
import { CopyOptions } from "./types/tx2umlTypes"
import { Transaction } from "ethers"
import { serialize } from "./ethers/transactions"

const debug = require("debug")("tx2uml")

export const copyTransactions = async (
    hashes: string[],
    options: CopyOptions
) => {
    const sourceProvider = new GethClient(options.url).ethersProvider
    const destProvider = new GethClient(options.destUrl).ethersProvider

    for (const hash of hashes) {
        // Get the transaction from the source chains
        const sourceTx = await sourceProvider.getTransaction(hash)
        debug(`Got raw tx ${sourceTx.raw} for source ${hash}.`)
        const rawTx = getRawTransaction(sourceTx)

        // replay transactions to destination
        const destTx = await destProvider.sendTransaction(rawTx)
        debug(`${destTx.hash} is hash of replayed source tx ${hash}.`)
        await destTx.wait()
        debug(`${destTx.hash} replayed tx has been mined.`)
    }
}

// Taken from Ethers.js Cookbook
// https://docs.ethers.org/v5/cookbook/transactions/#cookbook--compute-raw-transaction
const getRawTransaction = (tx: Transaction) => {
    function addKey(accum: any, key: keyof Transaction) {
        if (tx[key] !== undefined) {
            debug(`adding ${key}: ${tx[key]}`)
            accum[key] = tx[key]
        }
        return accum
    }

    // Extract the relevant parts of the transaction and signature
    const txFields =
        "accessList chainId data gasPrice gasLimit maxFeePerGas maxPriorityFeePerGas nonce to type value".split(
            " "
        )
    const sigFields = "v r s".split(" ")

    // Serialize the signed transaction
    const transaction = txFields.reduce(addKey, {})
    const signature = sigFields.reduce(addKey, {})
    // Ethers is strict on EIP-1559 fees ensuring the gasPrice matches the maxFeePerGas
    // so a modified version of Ethers' serialize is used without this check.
    const raw = serialize(transaction, signature)

    return raw
}
