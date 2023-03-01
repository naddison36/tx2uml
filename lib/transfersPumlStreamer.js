"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.writeBalances = exports.writeMessages = exports.writeParticipants = exports.singleTransfer2PumlStream = exports.multiTransfers2PumlStream = exports.transfers2PumlStream = void 0;
const stream_1 = require("stream");
const formatters_1 = require("./utils/formatters");
const utils_1 = require("ethers/lib/utils");
const ethers_1 = require("ethers");
const debug = require("debug")("tx2uml");
const transfers2PumlStream = (transactions, transfers, participants) => {
    const pumlStream = new stream_1.Readable({
        read() { },
    });
    if (transactions.length > 1) {
        (0, exports.multiTransfers2PumlStream)(pumlStream, transactions, transfers, participants);
    }
    else {
        (0, exports.singleTransfer2PumlStream)(pumlStream, transactions[0], transfers[0], participants);
    }
    return pumlStream;
};
exports.transfers2PumlStream = transfers2PumlStream;
const multiTransfers2PumlStream = (pumlStream, transactions, transfers, participants) => {
    pumlStream.push(`@startuml\n`);
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
        pumlStream.push("end");
        i++;
    }
    (0, exports.writeBalances)(pumlStream, totalParticipantPositions, participants);
    pumlStream.push("\n@endumls");
    pumlStream.push(null);
    return pumlStream;
};
exports.multiTransfers2PumlStream = multiTransfers2PumlStream;
const singleTransfer2PumlStream = (pumlStream, transaction, transfers, participants) => {
    pumlStream.push(`@startuml\ntitle ${transaction.hash}\n`);
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
            participantPositions[transfer.from][transfer.tokenAddress].balance =
                participantPositions[transfer.from][transfer.tokenAddress].balance.sub(transfer.value);
            participantPositions[transfer.to][transfer.tokenAddress].balance =
                participantPositions[transfer.to][transfer.tokenAddress].balance.add(transfer.value);
        }
        // If a NFT transfer
        if (transfer.tokenId) {
            // For the from participant
            // add to removedIds
            participantPositions[transfer.from][transfer.tokenAddress].removedIds.add(transfer.tokenId);
            // remove from addedIds
            participantPositions[transfer.from][transfer.tokenAddress].addedIds.delete(transfer.tokenId);
            // For the to participant
            // add remove removedIds
            participantPositions[transfer.to][transfer.tokenAddress].removedIds.delete(transfer.tokenId);
            // add to addedIds
            participantPositions[transfer.to][transfer.tokenAddress].addedIds.add(transfer.tokenId);
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
        if (participant.name)
            name += `<<${participant.name}>>`;
        if (participant.symbol)
            name += `<<(${participant.symbol})>>`;
        debug(`Write lifeline ${(0, formatters_1.shortAddress)(address)} with stereotype ${name}`);
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
        const value = transfer.value
            ? `${transfer.event || ""} ${(0, utils_1.commify)((0, utils_1.formatUnits)(transfer.value, transfer.decimals || 0))} ${transfer.tokenSymbol || "ETH"}`
            : `${transfer.event || ""} ${transfer.tokenSymbol} id ${transfer.tokenId}`;
        plantUmlStream.push(`${(0, formatters_1.participantId)(transfer.from)} -> ${(0, formatters_1.participantId)(transfer.to)}: ${value}\n`);
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
                symbol: "ETH",
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
    return `caption block ${details.blockNumber}, ${details.timestamp.toUTCString()}`;
};
const genTokenBalance = (plantUmlStream, position, token) => {
    if (!position?.balance.eq(0)) {
        plantUmlStream.push(`\n${(0, utils_1.commify)((0, utils_1.formatUnits)(position.balance, token.decimals || 0))} ${token.symbol || ""}`);
    }
};
const genNftChanges = (plantUmlStream, position, token) => {
    if (position.removedIds.size + position.addedIds.size > 0) {
        plantUmlStream.push(`\n${token.symbol}`);
    }
    if (position.removedIds.size > 0) {
        position.removedIds.forEach(id => {
            plantUmlStream.push(`\n  -${id}`);
        });
    }
    if (position.addedIds.size > 0) {
        position.addedIds.forEach(id => {
            plantUmlStream.push(`\n  +${id}`);
        });
    }
};
//# sourceMappingURL=transfersPumlStreamer.js.map