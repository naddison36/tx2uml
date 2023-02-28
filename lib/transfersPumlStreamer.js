"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.writeBalances = exports.writeMessages = exports.writeParticipants = exports.singleTransfer2PumlStream = exports.multiTransfers2PumlStream = exports.transfers2PumlStream = void 0;
const stream_1 = require("stream");
const formatters_1 = require("./utils/formatters");
const utils_1 = require("ethers/lib/utils");
const ethers_1 = require("ethers");
const debug = require("debug")("tx2uml");
const transfers2PumlStream = (transactions, transfers, contracts) => {
    const pumlStream = new stream_1.Readable({
        read() { },
    });
    if (transactions.length > 1) {
        (0, exports.multiTransfers2PumlStream)(pumlStream, transactions, transfers, contracts);
    }
    else {
        (0, exports.singleTransfer2PumlStream)(pumlStream, transactions[0], transfers[0], contracts);
    }
    return pumlStream;
};
exports.transfers2PumlStream = transfers2PumlStream;
const multiTransfers2PumlStream = (pumlStream, transactions, transfers, contracts) => {
    pumlStream.push(`@startuml\n`);
    // Filter out any contracts that don't have a transfer from or to
    const filteredContracts = filterParticipantContracts(contracts, transfers);
    (0, exports.writeParticipants)(pumlStream, filteredContracts);
    let i = 0;
    for (const transaction of transactions) {
        pumlStream.push(`\ngroup ${transaction.hash}`);
        (0, exports.writeMessages)(pumlStream, transfers[i++]);
        pumlStream.push("end");
    }
    pumlStream.push("\n@endumls");
    pumlStream.push(null);
    return pumlStream;
};
exports.multiTransfers2PumlStream = multiTransfers2PumlStream;
const singleTransfer2PumlStream = (pumlStream, transaction, transfers, contracts) => {
    pumlStream.push(`@startuml\ntitle ${transaction.hash}\n`);
    pumlStream.push(genCaption(transaction));
    // Filter out any contracts that don't have a transfer from or to
    const filteredContracts = filterParticipantContracts(contracts, transfers);
    const participantPositions = netParticipantValues(transfers, {});
    (0, exports.writeParticipants)(pumlStream, filteredContracts);
    (0, exports.writeMessages)(pumlStream, transfers);
    (0, exports.writeBalances)(pumlStream, participantPositions, contracts);
    pumlStream.push("\n@endumls");
    pumlStream.push(null);
    return pumlStream;
};
exports.singleTransfer2PumlStream = singleTransfer2PumlStream;
// Filter out any contracts that don't have a transfer from or to
const filterParticipantContracts = (contracts, transfers) => {
    const filteredContracts = {};
    Object.keys(contracts)
        .filter(key => transfers.flat().some(t => t.from === key || t.to === key))
        .forEach(key => (filteredContracts[key] = contracts[key]));
    return filteredContracts;
};
const netParticipantValues = (transfers, participantPositions = {}) => {
    // for each transfer
    transfers.forEach(transfer => {
        // Continue if no value which is probably an NFT transfer
        if (!transfer.value)
            return;
        if (!participantPositions[transfer.from]) {
            participantPositions[transfer.from] = {};
        }
        if (!participantPositions[transfer.from][transfer.tokenAddress]) {
            participantPositions[transfer.from][transfer.tokenAddress] =
                ethers_1.BigNumber.from(0);
        }
        participantPositions[transfer.from][transfer.tokenAddress] =
            participantPositions[transfer.from][transfer.tokenAddress].sub(transfer.value);
        if (!participantPositions[transfer.to]) {
            participantPositions[transfer.to] = {};
        }
        if (!participantPositions[transfer.to][transfer.tokenAddress]) {
            participantPositions[transfer.to][transfer.tokenAddress] =
                ethers_1.BigNumber.from(0);
        }
        participantPositions[transfer.to][transfer.tokenAddress] =
            participantPositions[transfer.to][transfer.tokenAddress].add(transfer.value);
    });
    return participantPositions;
};
const writeParticipants = (plantUmlStream, contracts) => {
    plantUmlStream.push("\n");
    // output contracts as participants
    for (const [address, contract] of Object.entries(contracts)) {
        let name = "";
        if (contract.protocol)
            name += `<<${contract.protocol}>>`;
        if (contract.tokenName)
            name += `<<${contract.tokenName}>>`;
        if (contract.symbol)
            name += `<<(${contract.symbol})>>`;
        if (contract.contractName)
            name += `<<${contract.contractName}>>`;
        debug(`Write lifeline ${(0, formatters_1.shortAddress)(address)} with stereotype ${name}`);
        const participantType = contract.noContract ? "actor" : "participant";
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
            ? `${(0, utils_1.formatUnits)(transfer.value, transfer.decimals || 0)} ${transfer.tokenSymbol || "ETH"}`
            : `${transfer.tokenSymbol} id ${transfer.tokenId}`;
        plantUmlStream.push(`${(0, formatters_1.participantId)(transfer.from)} -> ${(0, formatters_1.participantId)(transfer.to)}: ${value}\n`);
    }
};
exports.writeMessages = writeMessages;
const writeBalances = (plantUmlStream, participantBalances, contracts) => {
    plantUmlStream.push("\n");
    let firstParticipant = true;
    Object.keys(participantBalances).forEach(participant => {
        const align = firstParticipant ? "" : "/ ";
        firstParticipant = false;
        plantUmlStream.push(`\n${align}note over ${(0, formatters_1.participantId)(participant)} #aqua`);
        // For each participant's token balance
        Object.keys(participantBalances[participant]).forEach(tokenAddress => {
            // Get token details for use Ether details
            const token = contracts[tokenAddress] || {
                symbol: "ETH",
                decimals: 18,
            };
            const balance = participantBalances[participant][tokenAddress];
            if (balance.eq(0))
                return;
            plantUmlStream.push(`\n${(0, utils_1.commify)((0, utils_1.formatUnits)(balance, token.decimals))} ${token.symbol}`);
        });
        plantUmlStream.push("\nend note");
    });
};
exports.writeBalances = writeBalances;
const genCaption = (details) => {
    return `caption block ${details.blockNumber}, ${details.timestamp.toUTCString()}`;
};
//# sourceMappingURL=transfersPumlStreamer.js.map