import { Readable } from "stream"

import {
    ParticipantPositions,
    Participants,
    Position,
    TransactionDetails,
    Transfer,
    TransferType,
} from "./types/tx2umlTypes"
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
        pumlStream.push("\nend")
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

const netParticipantValues = (
    transfers: readonly Transfer[],
    participantPositions: ParticipantPositions = {}
) => {
    // for each transfer
    transfers.forEach(transfer => {
        // Add empty position for the from token
        if (!participantPositions[transfer.from]) {
            participantPositions[transfer.from] = {}
        }
        if (!participantPositions[transfer.from][transfer.tokenAddress]) {
            participantPositions[transfer.from][transfer.tokenAddress] =
                createEmptyPosition()
        }
        // Add empty position for the to token
        if (!participantPositions[transfer.to]) {
            participantPositions[transfer.to] = {}
        }
        if (!participantPositions[transfer.to][transfer.tokenAddress]) {
            participantPositions[transfer.to][transfer.tokenAddress] =
                createEmptyPosition()
        }
        // If a transfer of a token or ether
        if (transfer.value) {
            if (transfer.type !== TransferType.Mint) {
                participantPositions[transfer.from][
                    transfer.tokenAddress
                ].balance = participantPositions[transfer.from][
                    transfer.tokenAddress
                ].balance.sub(transfer.value)
            }

            if (transfer.type !== TransferType.Burn) {
                participantPositions[transfer.to][
                    transfer.tokenAddress
                ].balance = participantPositions[transfer.to][
                    transfer.tokenAddress
                ].balance.add(transfer.value)
            }
        }
        // If a NFT transfer
        if (transfer.tokenId) {
            if (transfer.type !== TransferType.Mint) {
                // For the from participant
                // add to removedIds
                participantPositions[transfer.from][
                    transfer.tokenAddress
                ].removedIds.add(transfer.tokenId)
                // remove from addedIds
                participantPositions[transfer.from][
                    transfer.tokenAddress
                ].addedIds.delete(transfer.tokenId)
            }

            if (transfer.type !== TransferType.Burn) {
                // For the to participant
                // add remove removedIds
                participantPositions[transfer.to][
                    transfer.tokenAddress
                ].removedIds.delete(transfer.tokenId)
                // add to addedIds
                participantPositions[transfer.to][
                    transfer.tokenAddress
                ].addedIds.add(transfer.tokenId)
            }
        }
    })
}

const createEmptyPosition = (): Position => ({
    balance: BigNumber.from(0),
    addedIds: new Set<number>(),
    removedIds: new Set<number>(),
})

export const writeParticipants = (
    plantUmlStream: Readable,
    participants: Readonly<Participants>
) => {
    plantUmlStream.push("\n")

    // output participants
    for (const [address, participant] of Object.entries(participants)) {
        let name: string = ""
        if (participant.protocol) name += `<<${participant.protocol}>>`
        participant.labels?.forEach(label => {
            name += `<<${label}>>`
        })
        // Use token name, else the label or Etherscan name
        if (participant.tokenName || participant.name)
            name += `<<${participant.tokenName || participant.name}>>`
        if (participant.tokenSymbol) name += `<<(${participant.tokenSymbol})>>`

        debug(`Write lifeline for ${address} with stereotype ${name}`)
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
        const displayValue = transfer.value
            ? `${transfer.event || ""} ${commify(
                  formatUnits(transfer.value, transfer.decimals || 0)
              )} ${transfer.tokenSymbol || "ETH"}`
            : `${transfer.event || ""} ${transfer.tokenSymbol} id ${
                  transfer.tokenId
              }`
        plantUmlStream.push(
            `${participantId(transfer.from)} ${genArrow(
                transfer
            )} ${participantId(transfer.to)}: ${displayValue}\n`
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
            // Get token details or use Ether details
            const token = participants[tokenAddress] || {
                tokenSymbol: "ETH",
                decimals: 18,
            }
            genTokenBalance(
                plantUmlStream,
                participantBalances[participant][tokenAddress],
                token
            )
            genNftChanges(
                plantUmlStream,
                participantBalances[participant][tokenAddress],
                token
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

const genTokenBalance = (
    plantUmlStream: Readable,
    position: Position,
    token: { tokenSymbol?: string; decimals?: number }
) => {
    if (!position?.balance.eq(0)) {
        plantUmlStream.push(
            `\n${commify(formatUnits(position.balance, token.decimals || 0))} ${
                token.tokenSymbol || ""
            }`
        )
    }
}

const genNftChanges = (
    plantUmlStream: Readable,
    position: Position,
    token: { tokenSymbol?: string }
) => {
    if (position.removedIds.size + position.addedIds.size > 0) {
        plantUmlStream.push(`\n${token.tokenSymbol}`)
    }
    if (position.removedIds.size > 0) {
        position.removedIds.forEach(id => {
            plantUmlStream.push(`\n  -${id}`)
        })
    }
    if (position.addedIds.size > 0) {
        position.addedIds.forEach(id => {
            plantUmlStream.push(`\n  +${id}`)
        })
    }
}

const genArrow = (transfer: Transfer): string =>
    transfer.type === TransferType.Transfer
        ? "->"
        : transfer.type === TransferType.Burn
        ? "-x"
        : "o->"
