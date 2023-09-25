"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.writeBalances = exports.writeMessages = exports.writeParticipants = exports.singleTransfer2PumlStream = exports.multiTransfers2PumlStream = exports.transfers2PumlStream = void 0;
const stream_1 = require("stream");
const tx2umlTypes_1 = require("./types/tx2umlTypes");
const formatters_1 = require("./utils/formatters");
const utils_1 = require("ethers/lib/utils");
const ethers_1 = require("ethers");
const address_1 = require("@ethersproject/address");
const debug = require("debug")("tx2uml");
let networkCurrency = "ETH";
const transfers2PumlStream = (transactions, transfers, participants, network, options = {}) => {
    networkCurrency = (0, tx2umlTypes_1.setNetworkCurrency)(network);
    const pumlStream = new stream_1.Readable({
        read() { },
    });
    if (transactions.length > 1) {
        (0, exports.multiTransfers2PumlStream)(pumlStream, transactions, transfers, participants, options);
    }
    else {
        (0, exports.singleTransfer2PumlStream)(pumlStream, transactions[0], transfers[0], participants, options);
    }
    return pumlStream;
};
exports.transfers2PumlStream = transfers2PumlStream;
const multiTransfers2PumlStream = (pumlStream, transactions, transfers, participants, options = {}) => {
    pumlStream.push(`@startuml\n`);
    if (options.title) {
        pumlStream.push(`title "${options.title}"\n`);
    }
    if (options.hideFooter) {
        pumlStream.push(`hide footbox\n`);
    }
    if (!options.hideCaption) {
        pumlStream.push(genCaption(transactions));
    }
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
        if (!options.hideBalances) {
            (0, exports.writeBalances)(pumlStream, txParticipantPositions, participants);
        }
        pumlStream.push("\nend");
        i++;
    }
    if (!options.hideBalances) {
        (0, exports.writeBalances)(pumlStream, totalParticipantPositions, participants);
    }
    pumlStream.push("\n@endumls");
    pumlStream.push(null);
    return pumlStream;
};
exports.multiTransfers2PumlStream = multiTransfers2PumlStream;
const singleTransfer2PumlStream = (pumlStream, transaction, transfers, participants, options = {}) => {
    pumlStream.push(`@startuml\n`);
    pumlStream.push(`title "${options.title || transaction.hash}"\n`);
    if (options.hideFooter) {
        pumlStream.push(`hide footbox\n`);
    }
    if (!options.hideCaption) {
        pumlStream.push(genCaption(transaction));
    }
    // Filter out any contracts that don't have a transfer from or to
    const filteredContracts = filterParticipantContracts(participants, transfers);
    const participantPositions = {};
    netParticipantValues(transfers, participantPositions);
    (0, exports.writeParticipants)(pumlStream, filteredContracts);
    (0, exports.writeMessages)(pumlStream, transfers);
    if (!options.hideBalances) {
        (0, exports.writeBalances)(pumlStream, participantPositions, participants);
    }
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
        const tokenId = !transfer.tokenId
            ? "erc20"
            : (0, utils_1.isAddress)(transfer.tokenId.toHexString())
                ? (0, address_1.getAddress)(transfer.tokenId.toHexString())
                : transfer.tokenId.toString();
        // Add empty position for the from token
        if (!participantPositions[transfer.from]) {
            participantPositions[transfer.from] = {};
        }
        if (!participantPositions[transfer.from][transfer.tokenAddress]) {
            participantPositions[transfer.from][transfer.tokenAddress] = {};
        }
        if (!participantPositions[transfer.from][transfer.tokenAddress][tokenId]) {
            participantPositions[transfer.from][transfer.tokenAddress][tokenId] = ethers_1.BigNumber.from(0);
        }
        // Add empty position for the to token
        if (!participantPositions[transfer.to]) {
            participantPositions[transfer.to] = {};
        }
        if (!participantPositions[transfer.to][transfer.tokenAddress]) {
            participantPositions[transfer.to][transfer.tokenAddress] = {};
        }
        if (!participantPositions[transfer.to][transfer.tokenAddress][tokenId]) {
            participantPositions[transfer.to][transfer.tokenAddress][tokenId] =
                ethers_1.BigNumber.from(0);
        }
        if (transfer.type !== tx2umlTypes_1.TransferType.Mint) {
            participantPositions[transfer.from][transfer.tokenAddress][tokenId] = participantPositions[transfer.from][transfer.tokenAddress][tokenId].sub(transfer.value || 1);
        }
        if (transfer.type !== tx2umlTypes_1.TransferType.Burn) {
            participantPositions[transfer.to][transfer.tokenAddress][tokenId] =
                participantPositions[transfer.to][transfer.tokenAddress][tokenId].add(transfer.value || 1);
        }
    });
};
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
        if (participant.tokenName)
            name += `<<${participant.tokenName}>>`;
        if (participant.tokenSymbol)
            name += `<<(${participant.tokenSymbol})>>`;
        if (participant.ensName)
            name += `<<(${participant.ensName})>>`;
        if (participant.contractName)
            name += `<<${participant.contractName}>>`;
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
        let displayValue;
        if (transfer.value && !transfer.tokenId) {
            displayValue = `${transfer.event || ""} ${(0, utils_1.commify)((0, utils_1.formatUnits)(transfer.value, transfer.decimals || 0))} ${transfer.tokenSymbol ||
                (!transfer.tokenAddress ? networkCurrency : "")}`;
        }
        else if (transfer.value &&
            ethers_1.utils.isAddress(transfer.tokenId?.toHexString())) {
            displayValue = `${transfer.event || ""} ${(0, utils_1.commify)((0, utils_1.formatUnits)(transfer.value, transfer.decimals || 0))} ${transfer.tokenSymbol || ""}\\nin ${(0, formatters_1.shortAddress)(transfer.tokenAddress)}`;
        }
        else {
            const quantity = transfer.value ? `${transfer.value} ` : ``;
            displayValue = `${transfer.event || ""} ${quantity}${transfer.tokenSymbol || ""}\\nid ${(0, formatters_1.shortTokenId)(transfer.tokenId)}`;
        }
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
            genTokenBalances(plantUmlStream, participantBalances[participant][tokenAddress], participants, {
                ...token,
                address: tokenAddress,
            });
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
const genTokenBalances = (plantUmlStream, tokenIds, participants, token) => {
    let lastTokenSymbol;
    for (const [tokenId, balance] of Object.entries(tokenIds)) {
        if (balance.eq(0))
            continue;
        const sign = balance.gt(0) ? "+" : "";
        if (tokenId === "erc20") {
            plantUmlStream.push(`\n${sign}${(0, utils_1.commify)((0, utils_1.formatUnits)(balance, token.decimals || 0))} ${token.tokenSymbol || "ETH"}`);
        }
        else {
            if (lastTokenSymbol != token.tokenSymbol) {
                plantUmlStream.push(`\n${token.tokenSymbol}`);
            }
            if ((0, utils_1.isAddress)(tokenId)) {
                const token1155 = participants[tokenId] || token;
                plantUmlStream.push(`\n  ${sign}${(0, utils_1.commify)((0, utils_1.formatUnits)(balance, token1155.decimals || 0))} ${token1155.tokenSymbol}\n    in ${(0, formatters_1.shortAddress)(token.address)}`);
                continue;
            }
            else {
                plantUmlStream.push(`\n  ${sign}${(0, utils_1.commify)((0, utils_1.formatUnits)(balance, token.decimals || 0))} id ${(0, formatters_1.shortTokenId)(tokenId)}`);
            }
        }
        lastTokenSymbol = token.tokenSymbol;
    }
};
const genArrow = (transfer) => transfer.type === tx2umlTypes_1.TransferType.Transfer
    ? "->"
    : transfer.type === tx2umlTypes_1.TransferType.Burn
        ? "-x"
        : "o->";
//# sourceMappingURL=transfersPumlStreamer.js.map