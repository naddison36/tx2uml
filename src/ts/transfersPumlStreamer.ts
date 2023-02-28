import { Readable } from "stream"

import { Contracts, TransactionDetails, Transfer } from "./transaction"
import { participantId, shortAddress } from "./utils/formatters"
import { commify, formatUnits } from "ethers/lib/utils"
import { BigNumber } from "ethers"

const debug = require("debug")("tx2uml")

export const transfers2PumlStream = (
    transactions: readonly Readonly<TransactionDetails>[],
    transfers: readonly Readonly<Transfer>[][],
    contracts: Readonly<Contracts>
): Readable => {
    const pumlStream = new Readable({
        read() {},
    })
    if (transactions.length > 1) {
        multiTransfers2PumlStream(
            pumlStream,
            transactions,
            transfers,
            contracts
        )
    } else {
        singleTransfer2PumlStream(
            pumlStream,
            transactions[0],
            transfers[0],
            contracts
        )
    }

    return pumlStream
}

export const multiTransfers2PumlStream = (
    pumlStream: Readable,
    transactions: readonly TransactionDetails[],
    transfers: readonly Transfer[][],
    contracts: Readonly<Contracts>
) => {
    pumlStream.push(`@startuml\n`)

    // Filter out any contracts that don't have a transfer from or to
    const filteredContracts = filterParticipantContracts(contracts, transfers)

    writeParticipants(pumlStream, filteredContracts)
    let i = 0
    for (const transaction of transactions) {
        pumlStream.push(`\ngroup ${transaction.hash}`)
        writeMessages(pumlStream, transfers[i++])
        pumlStream.push("end")
    }

    pumlStream.push("\n@endumls")
    pumlStream.push(null)

    return pumlStream
}

export const singleTransfer2PumlStream = (
    pumlStream: Readable,
    transaction: Readonly<TransactionDetails>,
    transfers: readonly Transfer[],
    contracts: Readonly<Contracts>
): Readable => {
    pumlStream.push(`@startuml\ntitle ${transaction.hash}\n`)
    pumlStream.push(genCaption(transaction))

    // Filter out any contracts that don't have a transfer from or to
    const filteredContracts = filterParticipantContracts(contracts, transfers)
    const participantPositions = netParticipantValues(transfers, {})

    writeParticipants(pumlStream, filteredContracts)
    writeMessages(pumlStream, transfers)
    writeBalances(pumlStream, participantPositions, contracts)

    pumlStream.push("\n@endumls")
    pumlStream.push(null)

    return pumlStream
}

// Filter out any contracts that don't have a transfer from or to
const filterParticipantContracts = (
    contracts: Readonly<Contracts>,
    transfers: readonly Transfer[] | readonly Transfer[][]
): Contracts => {
    const filteredContracts: Contracts = {}
    Object.keys(contracts)
        .filter(key =>
            transfers.flat().some(t => t.from === key || t.to === key)
        )
        .forEach(key => (filteredContracts[key] = contracts[key]))
    return filteredContracts
}

// Mapping of participant address to token addresses to balances
// Participant -> Token -> Balance
type ParticipantPositions = {
    [address: string]: {
        [address: string]: BigNumber
    }
}

const netParticipantValues = (
    transfers: readonly Transfer[],
    participantPositions: ParticipantPositions = {}
): ParticipantPositions => {
    // for each transfer
    transfers.forEach(transfer => {
        // Continue if no value which is probably an NFT transfer
        if (!transfer.value) return
        if (!participantPositions[transfer.from]) {
            participantPositions[transfer.from] = {}
        }
        if (!participantPositions[transfer.from][transfer.tokenAddress]) {
            participantPositions[transfer.from][transfer.tokenAddress] =
                BigNumber.from(0)
        }
        participantPositions[transfer.from][transfer.tokenAddress] =
            participantPositions[transfer.from][transfer.tokenAddress].sub(
                transfer.value
            )

        if (!participantPositions[transfer.to]) {
            participantPositions[transfer.to] = {}
        }
        if (!participantPositions[transfer.to][transfer.tokenAddress]) {
            participantPositions[transfer.to][transfer.tokenAddress] =
                BigNumber.from(0)
        }
        participantPositions[transfer.to][transfer.tokenAddress] =
            participantPositions[transfer.to][transfer.tokenAddress].add(
                transfer.value
            )
    })
    return participantPositions
}

export const writeParticipants = (
    plantUmlStream: Readable,
    contracts: Readonly<Contracts>
) => {
    plantUmlStream.push("\n")

    // output contracts as participants
    for (const [address, contract] of Object.entries(contracts)) {
        let name: string = ""
        if (contract.protocol) name += `<<${contract.protocol}>>`
        if (contract.tokenName) name += `<<${contract.tokenName}>>`
        if (contract.symbol) name += `<<(${contract.symbol})>>`
        if (contract.contractName) name += `<<${contract.contractName}>>`

        debug(`Write lifeline ${shortAddress(address)} with stereotype ${name}`)
        const participantType = contract.noContract ? "actor" : "participant"
        plantUmlStream.push(
            `${participantType} "${shortAddress(address)}" as ${participantId(
                address
            )} ${name}\n`
        )
    }
}

export const writeMessages = (
    plantUmlStream: Readable,
    transfers: readonly Transfer[]
) => {
    if (!transfers?.length) {
        return
    }
    plantUmlStream.push("\n")
    // for each trace
    for (const transfer of transfers) {
        const value = transfer.value
            ? `${commify(
                  formatUnits(transfer.value, transfer.decimals || 0)
              )} ${transfer.tokenSymbol || "ETH"}`
            : `${transfer.tokenSymbol} id ${transfer.tokenId}`
        plantUmlStream.push(
            `${participantId(transfer.from)} -> ${participantId(
                transfer.to
            )}: ${value}\n`
        )
    }
}

export const writeBalances = (
    plantUmlStream: Readable,
    participantBalances: ParticipantPositions,
    contracts: Contracts
) => {
    plantUmlStream.push("\n")

    let firstParticipant = true
    Object.keys(participantBalances).forEach(participant => {
        const align = firstParticipant ? "" : "/ "
        firstParticipant = false
        plantUmlStream.push(
            `\n${align}note over ${participantId(participant)} #aqua`
        )
        // For each participant's token balance
        Object.keys(participantBalances[participant]).forEach(tokenAddress => {
            // Get token details for use Ether details
            const token = contracts[tokenAddress] || {
                symbol: "ETH",
                decimals: 18,
            }
            const balance = participantBalances[participant][tokenAddress]
            if (balance.eq(0)) return
            plantUmlStream.push(
                `\n${commify(formatUnits(balance, token.decimals))} ${
                    token.symbol
                }`
            )
        })
        plantUmlStream.push("\nend note")
    })
}

const genCaption = (details: Readonly<TransactionDetails>): string => {
    return `caption block ${
        details.blockNumber
    }, ${details.timestamp.toUTCString()}`
}
