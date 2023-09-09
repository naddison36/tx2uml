"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.writeBalances = exports.writeMessages = exports.writeParticipants = exports.singleTransfer2PumlStream = exports.multiTransfers2PumlStream = exports.transfers2PumlStream = void 0;
const stream_1 = require("stream");
const tx2umlTypes_1 = require("./types/tx2umlTypes");
const formatters_1 = require("./utils/formatters");
const utils_1 = require("ethers/lib/utils");
const ethers_1 = require("ethers");
const debug = require("debug")("tx2uml");
let networkCurrency = "ETH";
const transfers2PumlStream = (transactions, transfers, participants, network, hideFooter) => {
    networkCurrency = (0, tx2umlTypes_1.setNetworkCurrency)(network);
    const pumlStream = new stream_1.Readable({
        read() { },
    });
    if (transactions.length > 1) {
        (0, exports.multiTransfers2PumlStream)(pumlStream, transactions, transfers, participants, hideFooter);
    }
    else {
        (0, exports.singleTransfer2PumlStream)(pumlStream, transactions[0], transfers[0], participants, hideFooter);
    }
    return pumlStream;
};
exports.transfers2PumlStream = transfers2PumlStream;
const multiTransfers2PumlStream = (pumlStream, transactions, transfers, participants, hideFooter) => {
    pumlStream.push(`@startuml\n`);
    if (hideFooter) {
        pumlStream.push(`hide footbox\n`);
    }
    pumlStream.push(genCaption(transactions));
    // Filter out any participants that don't have a transfer from or to.
    // This will be token contracts that don't mint or burn
    const filteredContracts = filterParticipantContracts(participants, transfers);
    (0, exports.writeParticipants)(pumlStream, filteredContracts);
    let i = 0;
    const totalParticipantPositions = {};
    for (const transaction of transactions) {
        pumlStream.push(`\ngroup ${transaction.hash}`);
        (0, exports.writeMessages)(pumlStream, transfers[i]);
        netParticipantValues(transfers[i], totalParticipantPositions);
        const txParticipantPositions = {};
        netParticipantValues(transfers[i], txParticipantPositions);
        (0, exports.writeBalances)(pumlStream, txParticipantPositions, participants);
        pumlStream.push("\nend");
        i++;
    }
    (0, exports.writeBalances)(pumlStream, totalParticipantPositions, participants);
    pumlStream.push("\n@endumls");
    pumlStream.push(null);
    return pumlStream;
};
exports.multiTransfers2PumlStream = multiTransfers2PumlStream;
const singleTransfer2PumlStream = (pumlStream, transaction, transfers, participants, hideFooter) => {
    pumlStream.push(`@startuml\ntitle ${transaction.hash}\n`);
    if (hideFooter) {
        pumlStream.push(`hide footbox\n`);
    }
    pumlStream.push(genCaption(transaction));
    // Filter out any contracts that don't have a transfer from or to
    const filteredContracts = filterParticipantContracts(participants, transfers);
    const participantPositions = {};
    netParticipantValues(transfers, participantPositions);
    (0, exports.writeParticipants)(pumlStream, filteredContracts);
    (0, exports.writeMessages)(pumlStream, transfers);
    (0, exports.writeBalances)(pumlStream, participantPositions, participants);
    pumlStream.push("\n@endumls");
    pumlStream.push(null);
    return pumlStream;
};
exports.singleTransfer2PumlStream = singleTransfer2PumlStream;
// Filter out any participating contracts that don't have a transfer from or to
const filterParticipantContracts = (participants, transfers) => {
    const filteredParticipants = {};
    Object.keys(participants)
        .filter(key => transfers.flat().some(t => t.from === key || t.to === key))
        .forEach(key => (filteredParticipants[key] = participants[key]));
    return filteredParticipants;
};
const netParticipantValues = (transfers, participantPositions = {}) => {
    // for each transfer
    transfers.forEach(transfer => {
        // Add empty position for the from token
        if (!participantPositions[transfer.from]) {
            participantPositions[transfer.from] = {};
        }
        if (!participantPositions[transfer.from][transfer.tokenAddress]) {
            participantPositions[transfer.from][transfer.tokenAddress] =
                createEmptyPosition();
        }
        // Add empty position for the to token
        if (!participantPositions[transfer.to]) {
            participantPositions[transfer.to] = {};
        }
        if (!participantPositions[transfer.to][transfer.tokenAddress]) {
            participantPositions[transfer.to][transfer.tokenAddress] =
                createEmptyPosition();
        }
        // If a transfer of a token or ether
        if (transfer.value) {
            if (transfer.type !== tx2umlTypes_1.TransferType.Mint) {
                participantPositions[transfer.from][transfer.tokenAddress].balance = participantPositions[transfer.from][transfer.tokenAddress].balance.sub(transfer.value);
            }
            if (transfer.type !== tx2umlTypes_1.TransferType.Burn) {
                participantPositions[transfer.to][transfer.tokenAddress].balance = participantPositions[transfer.to][transfer.tokenAddress].balance.add(transfer.value);
            }
        }
        // If a NFT transfer
        if (transfer.tokenId) {
            if (transfer.type !== tx2umlTypes_1.TransferType.Mint) {
                // For the from participant
                // add to removedIds
                participantPositions[transfer.from][transfer.tokenAddress].removedIds.add(transfer.tokenId.toString());
                // remove from addedIds
                participantPositions[transfer.from][transfer.tokenAddress].addedIds.delete(transfer.tokenId.toString());
            }
            if (transfer.type !== tx2umlTypes_1.TransferType.Burn) {
                // For the to participant
                // add remove removedIds
                participantPositions[transfer.to][transfer.tokenAddress].removedIds.delete(transfer.tokenId.toString());
                // add to addedIds
                participantPositions[transfer.to][transfer.tokenAddress].addedIds.add(transfer.tokenId.toString());
            }
        }
    });
};
const createEmptyPosition = () => ({
    balance: ethers_1.BigNumber.from(0),
    addedIds: new Set(),
    removedIds: new Set(),
});
const writeParticipants = (plantUmlStream, participants) => {
    plantUmlStream.push("\n");
    // output participants
    for (const [address, participant] of Object.entries(participants)) {
        let name = "";
        if (participant.protocol)
            name += `<<${participant.protocol}>>`;
        participant.labels?.forEach(label => {
            name += `<<${label}>>`;
        });
        // Use token name, else the label or Etherscan name
        if (participant.tokenName || participant.name)
            name += `<<${participant.tokenName || participant.name}>>`;
        if (participant.tokenSymbol)
            name += `<<(${participant.tokenSymbol})>>`;
        if (participant.ensName)
            name += `<<(${participant.ensName})>>`;
        debug(`Write lifeline for ${address} with stereotype ${name}`);
        const participantType = participant.noContract ? "actor" : "participant";
        plantUmlStream.push(`${participantType} "${(0, formatters_1.shortAddress)(address)}" as ${(0, formatters_1.participantId)(address)} ${name}\n`);
    }
};
exports.writeParticipants = writeParticipants;
const writeMessages = (plantUmlStream, transfers) => {
    if (!transfers?.length) {
        return;
    }
    plantUmlStream.push("\n");
    // for each trace
    for (const transfer of transfers) {
        const displayValue = transfer.value
            ? `${transfer.event || ""} ${(0, utils_1.commify)((0, utils_1.formatUnits)(transfer.value, transfer.decimals || 0))} ${transfer.tokenSymbol ||
                (!transfer.tokenAddress ? networkCurrency : "")}`
            : `${transfer.event || ""} ${transfer.tokenSymbol} id ${(0, formatters_1.shortTokenId)(transfer.tokenId)}`;
        plantUmlStream.push(`${(0, formatters_1.participantId)(transfer.from)} ${genArrow(transfer)} ${(0, formatters_1.participantId)(transfer.to)}: ${displayValue}\n`);
    }
};
exports.writeMessages = writeMessages;
const writeBalances = (plantUmlStream, participantBalances, participants) => {
    plantUmlStream.push("\n");
    let firstParticipant = true;
    Object.keys(participantBalances).forEach(participant => {
        const align = firstParticipant ? "" : "/ ";
        firstParticipant = false;
        plantUmlStream.push(`\n${align}note over ${(0, formatters_1.participantId)(participant)} #aqua`);
        // For each participant's token balance
        Object.keys(participantBalances[participant]).forEach(tokenAddress => {
            // Get token details or use Ether details
            const token = participants[tokenAddress] || {
                tokenSymbol: networkCurrency,
                decimals: 18,
            };
            genTokenBalance(plantUmlStream, participantBalances[participant][tokenAddress], token);
            genNftChanges(plantUmlStream, participantBalances[participant][tokenAddress], token);
        });
        plantUmlStream.push("\nend note\n");
    });
};
exports.writeBalances = writeBalances;
const genCaption = (details) => {
    if (Array.isArray(details)) {
        let caption = "footer\n";
        details.forEach(detail => (caption += `${detail.network}, block ${detail.blockNumber}, ${detail.timestamp.toUTCString()}\n`));
        caption += "\nendfooter";
        return caption;
    }
    else {
        const detail = details;
        return `\ncaption ${detail.network}, block ${detail.blockNumber}, ${detail.timestamp.toUTCString()}`;
    }
};
const genTokenBalance = (plantUmlStream, position, token) => {
    if (!position?.balance.eq(0)) {
        plantUmlStream.push(`\n${(0, utils_1.commify)((0, utils_1.formatUnits)(position.balance, token.decimals || 0))} ${token.tokenSymbol || ""}`);
    }
};
const genNftChanges = (plantUmlStream, position, token) => {
    if (position.removedIds.size + position.addedIds.size > 0) {
        plantUmlStream.push(`\n${token.tokenSymbol}`);
    }
    if (position.removedIds.size > 0) {
        position.removedIds.forEach(id => {
            plantUmlStream.push(`\n  -${(0, formatters_1.shortTokenId)(id)}`);
        });
    }
    if (position.addedIds.size > 0) {
        position.addedIds.forEach(id => {
            plantUmlStream.push(`\n  +${(0, formatters_1.shortTokenId)(id)}`);
        });
    }
};
const genArrow = (transfer) => transfer.type === tx2umlTypes_1.TransferType.Transfer
    ? "->"
    : transfer.type === tx2umlTypes_1.TransferType.Burn
        ? "-x"
        : "o->";
//# sourceMappingURL=transfersPumlStreamer.js.map