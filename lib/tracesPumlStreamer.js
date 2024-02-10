"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.writeEvents = exports.genParams = exports.writeMessages = exports.writeParticipants = exports.singleTx2PumlStream = exports.multiTxTraces2PumlStream = exports.traces2PumlStream = void 0;
const stream_1 = require("stream");
const utils_1 = require("ethers/lib/utils");
const ethers_1 = require("ethers");
const tx2umlTypes_1 = require("./types/tx2umlTypes");
const formatters_1 = require("./utils/formatters");
const debug = require("debug")("tx2uml");
const DelegateLifelineColor = "#809ECB";
const DelegateMessageColor = "#3471CD";
const FailureFillColor = "#FFAAAA";
let networkCurrency = "ETH";
const traces2PumlStream = (transactions, traces, contracts, options) => {
    networkCurrency = (0, tx2umlTypes_1.setNetworkCurrency)(options.chain);
    const pumlStream = new stream_1.Readable({
        read() { },
    });
    if (transactions.length > 1) {
        (0, exports.multiTxTraces2PumlStream)(pumlStream, transactions, traces, contracts, options);
    }
    else {
        (0, exports.singleTx2PumlStream)(pumlStream, transactions[0], traces[0], contracts, options);
    }
    return pumlStream;
};
exports.traces2PumlStream = traces2PumlStream;
const multiTxTraces2PumlStream = (pumlStream, transactions, traces, contracts, options = {}) => {
    pumlStream.push(`@startuml\n`);
    if (options.title) {
        pumlStream.push(`title ${options.title}\n`);
    }
    if (options.hideFooter) {
        pumlStream.push(`hide footbox\n`);
    }
    if (!options.hideCaption) {
        pumlStream.push(genCaption(transactions));
    }
    (0, exports.writeParticipants)(pumlStream, contracts, options);
    let i = 0;
    for (const transaction of transactions) {
        pumlStream.push(`\ngroup ${transaction.hash}`);
        writeTransactionDetails(pumlStream, transaction, options);
        (0, exports.writeMessages)(pumlStream, traces[i++], options);
        (0, exports.writeEvents)(transaction.hash, pumlStream, contracts, options);
        pumlStream.push("\nend");
    }
    pumlStream.push("\n@endumls");
    pumlStream.push(null);
    return pumlStream;
};
exports.multiTxTraces2PumlStream = multiTxTraces2PumlStream;
const singleTx2PumlStream = (pumlStream, transaction, traces, contracts, options) => {
    pumlStream.push("@startuml\n");
    pumlStream.push(`title ${options.title || transaction.hash}\n`);
    if (options.hideFooter) {
        pumlStream.push(`hide footbox\n`);
    }
    if (!options.hideCaption) {
        pumlStream.push(genCaption(transaction));
    }
    (0, exports.writeParticipants)(pumlStream, contracts, options);
    writeTransactionDetails(pumlStream, transaction, options);
    (0, exports.writeMessages)(pumlStream, traces, options);
    (0, exports.writeEvents)(transaction.hash, pumlStream, contracts, options);
    pumlStream.push("\n@endumls");
    pumlStream.push(null);
    return pumlStream;
};
exports.singleTx2PumlStream = singleTx2PumlStream;
const writeParticipants = (plantUmlStream, contracts, options = {}) => {
    plantUmlStream.push("\n");
    // output remaining contracts as actors or participants
    let participantType = "actor";
    for (const [address, contract] of Object.entries(contracts)) {
        // Do not write contract as a participant if min depth greater than trace depth
        if (options.depth > 0 && contract.minDepth > options.depth)
            continue;
        let stereotypes = "";
        if (contract.protocol)
            stereotypes += `<<${contract.protocol}>>`;
        if (contract.tokenName)
            stereotypes += `<<${contract.tokenName}>>`;
        if (contract.symbol)
            stereotypes += `<<(${contract.symbol})>>`;
        const contractName = getContractName(contract, options);
        if (contractName)
            stereotypes += `<<${contractName}>>`;
        if (contract.ensName)
            stereotypes += `<<(${contract.ensName})>>`;
        debug(`Write lifeline ${(0, formatters_1.shortAddress)(address)} with stereotype ${stereotypes}`);
        plantUmlStream.push(`${participantType} "${(0, formatters_1.shortAddress)(address)}" as ${(0, formatters_1.participantId)(address)} ${stereotypes}\n`);
        participantType = "participant";
    }
};
exports.writeParticipants = writeParticipants;
// Derives the contract name of a participant/contract.
// If contract is delegating calls to another contract and the noDelegates option is set,
// then use the contract name of the first delegated contract.
// Note there can be multiple delegated calls to different contracts.
// There can also be delegated calls to a library.
// Here's an example tx on mainnet 0x7210c306842d275044789b02ae64aff4513ed812682de7b1cbeb12a4a0dd07af
const getContractName = (contract, options) => {
    return options.noDelegates
        ? contract.delegatedToContracts?.[0]?.contractName ||
            contract.contractName
        : contract.contractName;
};
const writeTransactionDetails = (plantUmlStream, transaction, options = {}) => {
    if (options.noTxDetails) {
        return;
    }
    plantUmlStream.push(`\nnote over ${(0, formatters_1.participantId)(transaction.from)}`);
    if (transaction.error) {
        plantUmlStream.push(` ${FailureFillColor}\nError: ${transaction.error} \n`);
    }
    else {
        // no error so will use default colour of tx details note
        plantUmlStream.push("\n");
    }
    plantUmlStream.push(`Nonce: ${transaction.nonce.toLocaleString()}\n`);
    plantUmlStream.push(`Gas Price: ${(0, utils_1.formatUnits)(transaction.gasPrice, "gwei")} Gwei\n`);
    if (transaction.maxFeePerGas) {
        plantUmlStream.push(`Max Fee: ${(0, utils_1.formatUnits)(transaction.maxFeePerGas, "gwei")} Gwei\n`);
    }
    if (transaction.maxPriorityFeePerGas) {
        plantUmlStream.push(`Max Priority: ${(0, utils_1.formatUnits)(transaction.maxPriorityFeePerGas, "gwei")} Gwei\n`);
    }
    plantUmlStream.push(`Gas Limit: ${(0, formatters_1.formatNumber)(transaction.gasLimit.toString())}\n`);
    plantUmlStream.push(`Gas Used: ${(0, formatters_1.formatNumber)(transaction.gasUsed.toString())}\n`);
    const txFeeInWei = transaction.gasUsed.mul(transaction.gasPrice);
    const txFeeInEther = (0, utils_1.formatEther)(txFeeInWei);
    const tFeeInEtherFormatted = Number(txFeeInEther).toLocaleString();
    plantUmlStream.push(`Tx Fee: ${tFeeInEtherFormatted} ${networkCurrency}\n`);
    plantUmlStream.push("end note\n");
};
const writeMessages = (plantUmlStream, traces, options = {}) => {
    if (!traces?.length) {
        return;
    }
    let contractCallStack = [];
    let previousTrace;
    plantUmlStream.push("\n");
    // for each trace
    for (const trace of traces) {
        if (trace.depth > options.depth)
            continue;
        debug(`Write message ${trace.id} from ${trace.from} to ${trace.to}`);
        // return from lifeline if processing has moved to a different contract
        if (trace.delegatedFrom !== previousTrace?.to) {
            // contractCallStack is mutated in the loop so make a copy
            for (const callStack of [...contractCallStack]) {
                // stop returns when the callstack is back to this trace's lifeline
                if (trace.delegatedFrom === callStack.to) {
                    break;
                }
                plantUmlStream.push(genEndLifeline(callStack, options));
                contractCallStack.shift();
            }
        }
        if (trace.type === tx2umlTypes_1.MessageType.Selfdestruct) {
            plantUmlStream.push(`${(0, formatters_1.participantId)(trace.from)} ${genArrow(trace)} ${(0, formatters_1.participantId)(trace.from)}: Self-Destruct\n`);
            // TODO add ETH value transfer to refund address if there was a contract balance
        }
        else {
            const beforeParams = `${(0, formatters_1.participantId)(trace.from)} ${genArrow(trace)} ${(0, formatters_1.participantId)(trace.to)}: `;
            const afterParams = `${genGasUsage(trace.gasUsed, options.noGas)}${genEtherValue(trace, options.noEther)}\n`;
            const rawParams = `${genFunctionText(trace, options)}`;
            const maxParamLength = 2000 - beforeParams.length - afterParams.length;
            const truncatedParams = rawParams.slice(0, maxParamLength);
            if (maxParamLength < rawParams.length)
                console.warn(`params were truncated by ${truncatedParams.length - maxParamLength} characters`);
            plantUmlStream.push(beforeParams + truncatedParams + afterParams);
            if (trace.type === tx2umlTypes_1.MessageType.DelegateCall) {
                plantUmlStream.push(`activate ${(0, formatters_1.participantId)(trace.to)} ${DelegateLifelineColor}\n`);
            }
            else {
                plantUmlStream.push(`activate ${(0, formatters_1.participantId)(trace.to)}\n`);
            }
        }
        if (trace.type !== tx2umlTypes_1.MessageType.Selfdestruct) {
            contractCallStack.unshift(trace);
            previousTrace = trace;
        }
    }
    contractCallStack.forEach(callStack => {
        plantUmlStream.push(genEndLifeline(callStack, options));
    });
};
exports.writeMessages = writeMessages;
const genEndLifeline = (trace, options = {}) => {
    let plantUml = "";
    if (!trace.error) {
        if (options.noParams) {
            plantUml += `return\n`;
        }
        else {
            // remove the first carriage return
            plantUml += `return ${(0, exports.genParams)(trace.outputParams, options.noParamValues).replace(/\\n/, "")}\n`;
        }
        if (!options.noGas && trace.childTraces.length > 0) {
            const gasUsedLessChildCalls = calculateGasUsedLessChildTraces(trace);
            if (gasUsedLessChildCalls?.gt(0)) {
                plantUml += `note right of ${(0, formatters_1.participantId)(trace.to)}: ${genGasUsage(gasUsedLessChildCalls)}\n`;
            }
        }
    }
    else {
        // a failed transaction so end the lifeline
        plantUml += `destroy ${(0, formatters_1.participantId)(trace.to)}\nreturn\n`;
        plantUml += `note right of ${(0, formatters_1.participantId)(trace.to)} ${FailureFillColor}: ${trace.error}\n`;
    }
    return plantUml;
};
const calculateGasUsedLessChildTraces = (trace) => {
    // Sum gasUsed on all child traces of the parent
    let gasUsedLessChildTraces = ethers_1.BigNumber.from(0);
    for (const childTrace of trace.childTraces) {
        if (!childTrace.gasUsed) {
            return undefined;
        }
        gasUsedLessChildTraces = gasUsedLessChildTraces.add(childTrace.gasUsed);
    }
    return trace.gasUsed.sub(gasUsedLessChildTraces);
};
const genArrow = (trace) => {
    const arrowColor = trace.parentTrace?.type === tx2umlTypes_1.MessageType.DelegateCall
        ? `[${DelegateMessageColor}]`
        : "";
    const line = trace.proxy ? "--" : "-";
    if (trace.type === tx2umlTypes_1.MessageType.DelegateCall) {
        return `${line}${arrowColor}>>`;
    }
    if (trace.type === tx2umlTypes_1.MessageType.Create) {
        return `${line}${arrowColor}>o`;
    }
    if (trace.type === tx2umlTypes_1.MessageType.Selfdestruct) {
        return `${line}${arrowColor}\\`;
    }
    // Call and Staticcall are the same
    return `${line}${arrowColor}>`;
};
const genFunctionText = (trace, options) => {
    const noParams = options.noParams || options.noParamValues;
    if (!trace) {
        return "";
    }
    if (trace.type === tx2umlTypes_1.MessageType.Create) {
        if (noParams) {
            return "constructor";
        }
        // If we have the contract ABI so the constructor params could be parsed
        if (trace.parsedConstructorParams) {
            return `${trace.funcName}(${(0, exports.genParams)(trace.inputParams, options.noParamValues, "", oneIndent)})`;
        }
        // we don't know if there was constructor params or not as the contract was not verified on Etherscan
        // hence we don't have the constructor params or the contract ABI to parse them.
        return "constructor(?)";
    }
    if (!trace.funcSelector) {
        return options.noParams ? "fallback" : "fallback()";
    }
    if (!trace.funcName) {
        return `${trace.funcSelector}`;
    }
    if (options.noParams)
        return trace.funcName;
    return `${trace.funcName}(${(0, exports.genParams)(trace.inputParams, options.noParamValues, "", oneIndent)})`;
};
const oneIndent = "  ";
const genParams = (params, noValues, plantUml = "", indent = "") => {
    if (!params) {
        return "";
    }
    for (const param of params) {
        // put each param on a new line.
        // The \ needs to be escaped with \\
        plantUml += "\\n" + indent;
        if (param.name) {
            if (noValues) {
                plantUml += `${param.name},`;
                continue;
            }
            plantUml += `${param.name}: `;
        }
        else if (noValues) {
            // we don't know the param name and we aren't showing values
            // so we'll break from showing any params
            plantUml += "?,";
            continue;
        }
        if (param.type === "address") {
            plantUml += `${(0, formatters_1.shortAddress)(param.value)},`;
        }
        else if (param.components) {
            if (Array.isArray(param.components)) {
                plantUml += `[`;
                plantUml = `${(0, exports.genParams)(param.components, noValues, plantUml, indent + oneIndent)}`;
                plantUml += `],`;
            }
            else {
                debug(`Unsupported components type ${JSON.stringify(param.components)}`);
            }
        }
        else if (Array.isArray(param.value)) {
            // not a component but an array of params
            plantUml += `[`;
            param.value.forEach((value, i) => {
                plantUml = `${(0, exports.genParams)([
                    {
                        name: i.toString(),
                        value,
                        // remove the [] at the end of the type
                        type: param.type.slice(0, -2),
                    },
                ], noValues, plantUml, indent + oneIndent)}`;
            });
            plantUml += `],`;
        }
        else if (param.type.slice(0, 5) === "bytes") {
            plantUml += `${(0, formatters_1.shortBytes)(param.value)},`;
        }
        else if (param.type.match("int")) {
            plantUml += `${(0, formatters_1.formatNumber)(param.value)},`;
        }
        else {
            // Need to escape \n with \\n
            plantUml += `${(0, formatters_1.escapeCarriageReturns)(param.value)},`;
        }
    }
    return plantUml.slice(0, -1);
};
exports.genParams = genParams;
const genGasUsage = (gasUsed, noGasUsage = false) => {
    if (noGasUsage || !gasUsed) {
        return "";
    }
    // Add thousand comma separators
    const gasValueWithCommas = (0, formatters_1.formatNumber)(gasUsed.toString());
    return `\\n${gasValueWithCommas} gas`;
};
const genEtherValue = (trace, noEtherValue = false) => {
    if (noEtherValue || trace.value.eq(0)) {
        return "";
    }
    // Convert wei value to Ether
    const ether = (0, utils_1.formatEther)(trace.value);
    // Add thousand commas. Can't use formatNumber for this as it doesn't handle decimal numbers.
    // Assuming the amount of ether is not great than JS number limit.
    const etherFormatted = Number(ether).toLocaleString();
    return `\\n${etherFormatted} ${networkCurrency}`;
};
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
const writeEvents = (txHash, plantUmlStream, contracts, options = {}) => {
    if (options.noLogDetails) {
        return;
    }
    // For each contract
    let firstEvent = true;
    for (const contract of Object.values(contracts)) {
        if (contract.ethersContract &&
            contract.events?.length &&
            (options.depth === undefined || contract.minDepth <= options.depth)) {
            const txEvents = contract.events.filter(e => e.txHash === txHash);
            if (txEvents.length === 0)
                continue;
            const align = firstEvent ? "" : "/ ";
            firstEvent = false;
            plantUmlStream.push(`\n${align}note over ${(0, formatters_1.participantId)(contract.address)} #aqua`);
            for (const event of txEvents) {
                if (options.noParams) {
                    plantUmlStream.push(`\n${event.name}`);
                    continue;
                }
                plantUmlStream.push(`\n${event.name}:`);
                plantUmlStream.push(
                // replace \\n with \n
                `${(0, exports.genParams)(event.params, options.noParamValues, "", oneIndent).replace(/\\n/g, "\n")}`);
            }
            plantUmlStream.push("\nend note\n");
        }
    }
};
exports.writeEvents = writeEvents;
//# sourceMappingURL=tracesPumlStreamer.js.map