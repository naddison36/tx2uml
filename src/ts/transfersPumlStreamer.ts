import { Readable } from "stream"

import {
    Network,
    ParticipantPositions,
    Participants,
    setNetworkCurrency,
    TransactionDetails,
    Transfer,
    TransferPumlGenerationOptions,
    TransferType,
} from "./types/tx2umlTypes"
import { participantId, shortAddress, shortTokenId } from "./utils/formatters"
import { commify, formatUnits, isAddress } from "ethers/lib/utils"
import { BigNumber, utils } from "ethers"
import { getAddress } from "@ethersproject/address"

const debug = require("debug")("tx2uml")

let networkCurrency = "ETH"

export const transfers2PumlStream = (
    transactions: readonly Readonly<TransactionDetails>[],
    transfers: readonly Readonly<Transfer>[][],
    participants: Readonly<Participants>,
    network: Network,
    options: TransferPumlGenerationOptions = {}
): Readable => {
    networkCurrency = setNetworkCurrency(network)
    const pumlStream = new Readable({
        read() {},
    })
    if (transactions.length > 1) {
        multiTransfers2PumlStream(
            pumlStream,
            transactions,
            transfers,
            participants,
            options
        )
    } else {
        singleTransfer2PumlStream(
            pumlStream,
            transactions[0],
            transfers[0],
            participants,
            options
        )
    }

    return pumlStream
}

export const multiTransfers2PumlStream = (
    pumlStream: Readable,
    transactions: readonly TransactionDetails[],
    transfers: readonly Transfer[][],
    participants: Readonly<Participants>,
    options: TransferPumlGenerationOptions = {}
) => {
    pumlStream.push(`@startuml\n`)
    if (options.title) {
        pumlStream.push(`title "${options.title}"\n`)
    }
    if (options.hideFooter) {
        pumlStream.push(`hide footbox\n`)
    }
    if (!options.hideCaption) {
        pumlStream.push(genCaption(transactions))
    }

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
        if (!options.hideBalances) {
            writeBalances(pumlStream, txParticipantPositions, participants)
        }
        pumlStream.push("\nend")
        i++
    }

    if (!options.hideBalances) {
        writeBalances(pumlStream, totalParticipantPositions, participants)
    }

    pumlStream.push("\n@endumls")
    pumlStream.push(null)

    return pumlStream
}

export const singleTransfer2PumlStream = (
    pumlStream: Readable,
    transaction: Readonly<TransactionDetails>,
    transfers: readonly Transfer[],
    participants: Readonly<Participants>,
    options: TransferPumlGenerationOptions = {}
): Readable => {
    pumlStream.push(`@startuml\n`)
    pumlStream.push(`title "${options.title || transaction.hash}"\n`)
    if (options.hideFooter) {
        pumlStream.push(`hide footbox\n`)
    }
    if (!options.hideCaption) {
        pumlStream.push(genCaption(transaction))
    }

    // Filter out any contracts that don't have a transfer from or to
    const filteredContracts = filterParticipantContracts(
        participants,
        transfers
    )
    const participantPositions: ParticipantPositions = {}
    netParticipantValues(transfers, participantPositions)

    writeParticipants(pumlStream, filteredContracts)
    writeMessages(pumlStream, transfers)
    if (!options.hideBalances) {
        writeBalances(pumlStream, participantPositions, participants)
    }

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
        const tokenId = !transfer.tokenId
            ? "erc20"
            : isAddress(transfer.tokenId.toHexString())
              ? getAddress(transfer.tokenId.toHexString())
              : transfer.tokenId.toString()
        // Add empty position for the from token
        if (!participantPositions[transfer.from]) {
            participantPositions[transfer.from] = {}
        }
        if (!participantPositions[transfer.from][transfer.tokenAddress]) {
            participantPositions[transfer.from][transfer.tokenAddress] = {}
        }
        if (
            !participantPositions[transfer.from][transfer.tokenAddress][tokenId]
        ) {
            participantPositions[transfer.from][transfer.tokenAddress][
                tokenId
            ] = BigNumber.from(0)
        }
        // Add empty position for the to token
        if (!participantPositions[transfer.to]) {
            participantPositions[transfer.to] = {}
        }
        if (!participantPositions[transfer.to][transfer.tokenAddress]) {
            participantPositions[transfer.to][transfer.tokenAddress] = {}
        }
        if (
            !participantPositions[transfer.to][transfer.tokenAddress][tokenId]
        ) {
            participantPositions[transfer.to][transfer.tokenAddress][tokenId] =
                BigNumber.from(0)
        }
        if (transfer.type !== TransferType.Mint) {
            participantPositions[transfer.from][transfer.tokenAddress][
                tokenId
            ] = participantPositions[transfer.from][transfer.tokenAddress][
                tokenId
            ].sub(transfer.value || 1)
        }

        if (transfer.type !== TransferType.Burn) {
            participantPositions[transfer.to][transfer.tokenAddress][tokenId] =
                participantPositions[transfer.to][transfer.tokenAddress][
                    tokenId
                ].add(transfer.value || 1)
        }
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
        participant.labels?.forEach(label => {
            name += `<<${label}>>`
        })
        if (participant.tokenName) name += `<<${participant.tokenName}>>`
        if (participant.tokenSymbol) name += `<<(${participant.tokenSymbol})>>`
        if (participant.ensName) name += `<<(${participant.ensName})>>`
        if (participant.contractName) name += `<<${participant.contractName}>>`

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
        let displayValue: string
        if (transfer.value && !transfer.tokenId) {
            displayValue = `${transfer.event || ""} ${commify(
                formatUnits(transfer.value, transfer.decimals || 0)
            )} ${
                transfer.tokenSymbol ||
                (!transfer.tokenAddress ? networkCurrency : "")
            }`
        } else if (
            transfer.value &&
            utils.isAddress(transfer.tokenId?.toHexString())
        ) {
            displayValue = `${transfer.event || ""} ${commify(
                formatUnits(transfer.value, transfer.decimals || 0)
            )} ${transfer.tokenSymbol || ""}\\nin ${shortAddress(
                transfer.tokenAddress
            )}`
        } else {
            const quantity = transfer.value ? `${transfer.value} ` : ``
            displayValue = `${transfer.event || ""} ${quantity}${
                transfer.tokenSymbol || ""
            }\\nid ${shortTokenId(transfer.tokenId)}`
        }
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
                tokenSymbol: networkCurrency,
                decimals: 18,
            }
            genTokenBalances(
                plantUmlStream,
                participantBalances[participant][tokenAddress],
                participants,
                {
                    ...token,
                    address: tokenAddress,
                }
            )
        })
        plantUmlStream.push("\nend note\n")
    })
}

const genCaption = (
    details: Readonly<TransactionDetails> | readonly TransactionDetails[]
): string => {
    if (Array.isArray(details)) {
        let caption = "footer\n"
        details.forEach(
            detail =>
                (caption += `${detail.network}, block ${
                    detail.blockNumber
                }, ${detail.timestamp.toUTCString()}\n`)
        )
        caption += "\nendfooter"
        return caption
    } else {
        const detail = details as TransactionDetails
        return `\ncaption ${detail.network}, block ${
            detail.blockNumber
        }, ${detail.timestamp.toUTCString()}`
    }
}

const genTokenBalances = (
    plantUmlStream: Readable,
    tokenIds: { [tokenId: string]: BigNumber },
    participants: Readonly<Participants>,
    token: { address: string; tokenSymbol?: string; decimals?: number }
) => {
    let lastTokenSymbol: string
    for (const [tokenId, balance] of Object.entries(tokenIds)) {
        if (balance.eq(0)) continue
        const sign = balance.gt(0) ? "+" : ""
        if (tokenId === "erc20") {
            plantUmlStream.push(
                `\n${sign}${commify(
                    formatUnits(balance, token.decimals || 0)
                )} ${token.tokenSymbol || "ETH"}`
            )
        } else {
            if (lastTokenSymbol != token.tokenSymbol) {
                plantUmlStream.push(`\n${token.tokenSymbol}`)
            }
            if (isAddress(tokenId)) {
                const token1155 = participants[tokenId] || token
                plantUmlStream.push(
                    `\n  ${sign}${commify(
                        formatUnits(balance, token1155.decimals || 0)
                    )} ${token1155.tokenSymbol}\n    in ${shortAddress(
                        token.address
                    )}`
                )
                continue
            } else {
                plantUmlStream.push(
                    `\n  ${sign}${commify(
                        formatUnits(balance, token.decimals || 0)
                    )} id ${shortTokenId(tokenId)}`
                )
            }
        }
        lastTokenSymbol = token.tokenSymbol
    }
}

const genArrow = (transfer: Transfer): string =>
    transfer.type === TransferType.Transfer
        ? "->"
        : transfer.type === TransferType.Burn
          ? "-x"
          : "o->"
