import { Readable } from "stream"

import { Participants, TransactionDetails, Transfer } from "./transaction"
import { participantId, shortAddress } from "./utils/formatters"
import { commify, formatUnits } from "ethers/lib/utils"
import { BigNumber } from "ethers"

const debug = require("debug")("tx2uml")

export const transfers2PumlStream = (
    transactions: readonly Readonly<TransactionDetails>[],
    transfers: readonly Readonly<Transfer>[][],
    participants: Readonly<Participants>
): Readable => {
    const pumlStream = new Readable({
        read() {},
    })
    if (transactions.length > 1) {
        multiTransfers2PumlStream(
            pumlStream,
            transactions,
            transfers,
            participants
        )
    } else {
        singleTransfer2PumlStream(
            pumlStream,
            transactions[0],
            transfers[0],
            participants
        )
    }

    return pumlStream
}

export const multiTransfers2PumlStream = (
    pumlStream: Readable,
    transactions: readonly TransactionDetails[],
    transfers: readonly Transfer[][],
    participants: Readonly<Participants>
) => {
    pumlStream.push(`@startuml\n`)

    // Filter out any participants that don't have a transfer from or to.
    // This will be token contracts that don't mint or burn
    const filteredContracts = filterParticipantContracts(
        participants,
        transfers
    )

    writeParticipants(pumlStream, filteredContracts)
    let i = 0

    const totalParticipantPositions: ParticipantPositions = {}
    for (const transaction of transactions) {
        pumlStream.push(`\ngroup ${transaction.hash}`)
        writeMessages(pumlStream, transfers[i])

        netParticipantValues(transfers[i], totalParticipantPositions)
        const txParticipantPositions: ParticipantPositions = {}
        netParticipantValues(transfers[i], txParticipantPositions)
        writeBalances(pumlStream, txParticipantPositions, participants)
        pumlStream.push("end")
        i++
    }

    writeBalances(pumlStream, totalParticipantPositions, participants)

    pumlStream.push("\n@endumls")
    pumlStream.push(null)

    return pumlStream
}

export const singleTransfer2PumlStream = (
    pumlStream: Readable,
    transaction: Readonly<TransactionDetails>,
    transfers: readonly Transfer[],
    participants: Readonly<Participants>
): Readable => {
    pumlStream.push(`@startuml\ntitle ${transaction.hash}\n`)
    pumlStream.push(genCaption(transaction))

    // Filter out any contracts that don't have a transfer from or to
    const filteredContracts = filterParticipantContracts(
        participants,
        transfers
    )
    const participantPositions: ParticipantPositions = {}
    netParticipantValues(transfers, participantPositions)

    writeParticipants(pumlStream, filteredContracts)
    writeMessages(pumlStream, transfers)
    writeBalances(pumlStream, participantPositions, participants)

    pumlStream.push("\n@endumls")
    pumlStream.push(null)

    return pumlStream
}

// Filter out any participating contracts that don't have a transfer from or to
const filterParticipantContracts = (
    participants: Readonly<Participants>,
    transfers: readonly Transfer[] | readonly Transfer[][]
): Participants => {
    const filteredParticipants: Participants = {}
    Object.keys(participants)
        .filter(key =>
            transfers.flat().some(t => t.from === key || t.to === key)
        )
        .forEach(key => (filteredParticipants[key] = participants[key]))
    return filteredParticipants
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
) => {
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
}

export const writeParticipants = (
    plantUmlStream: Readable,
    participants: Readonly<Participants>
) => {
    plantUmlStream.push("\n")

    // output participants
    for (const [address, participant] of Object.entries(participants)) {
        let name: string = ""
        if (participant.protocol) name += `<<${participant.protocol}>>`
        if (participant.name) name += `<<${participant.name}>>`
        if (participant.symbol) name += `<<(${participant.symbol})>>`

        debug(`Write lifeline ${shortAddress(address)} with stereotype ${name}`)
        const participantType = participant.noContract ? "actor" : "participant"
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
            ? `${transfer.event || ""} ${commify(
                  formatUnits(transfer.value, transfer.decimals || 0)
              )} ${transfer.tokenSymbol || "ETH"}`
            : `${transfer.event || ""} ${transfer.tokenSymbol} id ${
                  transfer.tokenId
              }`
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
    participants: Readonly<Participants>
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
            const token = participants[tokenAddress] || {
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
        plantUmlStream.push("\nend note\n")
    })
}

const genCaption = (details: Readonly<TransactionDetails>): string => {
    return `caption block ${
        details.blockNumber
    }, ${details.timestamp.toUTCString()}`
}
