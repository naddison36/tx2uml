"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.genParams = exports.writeMessages = exports.writeParticipants = exports.streamSingleTxPuml = exports.streamMultiTxsPuml = exports.streamTxPlantUml = void 0;
const stream_1 = require("stream");
const utils_1 = require("ethers/lib/utils");
const ethers_1 = require("ethers");
const transaction_1 = require("./transaction");
const formatters_1 = require("./utils/formatters");
const debug = require("debug")("tx2uml");
const DelegateLifelineColor = "#809ECB";
const DelegateMessageColor = "#3471CD";
const FailureFillColor = "#FFAAAA";
const streamTxPlantUml = (transactions, traces, contracts, options = {}) => {
    const pumlStream = new stream_1.Readable({
        read() { },
    });
    if (transactions.length > 1) {
        exports.streamMultiTxsPuml(pumlStream, transactions, traces, contracts, options);
    }
    else {
        exports.streamSingleTxPuml(pumlStream, transactions[0], traces[0], contracts, options);
    }
    return pumlStream;
};
exports.streamTxPlantUml = streamTxPlantUml;
const streamMultiTxsPuml = (pumlStream, transactions, traces, contracts, options = {}) => {
    pumlStream.push(`@startuml\n`);
    exports.writeParticipants(pumlStream, contracts);
    let i = 0;
    for (const transaction of transactions) {
        pumlStream.push(`\ngroup ${transaction.hash}`);
        writeTransactionDetails(pumlStream, transaction, options);
        exports.writeMessages(pumlStream, traces[i++], options);
        pumlStream.push("end");
    }
    pumlStream.push("\n@endumls");
    pumlStream.push(null);
    return pumlStream;
};
exports.streamMultiTxsPuml = streamMultiTxsPuml;
const streamSingleTxPuml = (pumlStream, transaction, traces, contracts, options = {}) => {
    pumlStream.push(`@startuml\ntitle ${transaction.hash}\n`);
    pumlStream.push(genCaption(transaction, options));
    exports.writeParticipants(pumlStream, contracts);
    writeTransactionDetails(pumlStream, transaction, options);
    exports.writeMessages(pumlStream, traces, options);
    pumlStream.push("\n@endumls");
    pumlStream.push(null);
    return pumlStream;
};
exports.streamSingleTxPuml = streamSingleTxPuml;
const writeParticipants = (plantUmlStream, contracts) => {
    plantUmlStream.push("\n");
    for (const [address, contract] of Object.entries(contracts)) {
        let name = "";
        if (contract.tokenName) {
            if (contract.symbol) {
                name = `<<${contract.tokenName} (${contract.symbol})>>`;
            }
            else {
                name = `<<${contract.tokenName}>>`;
            }
        }
        if (contract.contractName) {
            name += `<<${contract.contractName}>>`;
        }
        debug(`Write lifeline ${formatters_1.shortAddress(address)} with stereotype ${name}`);
        plantUmlStream.push(`participant "${formatters_1.shortAddress(address)}" as ${formatters_1.participantId(address)} ${name}\n`);
    }
};
exports.writeParticipants = writeParticipants;
const writeTransactionDetails = (plantUmlStream, transaction, options = {}) => {
    if (options.noTxDetails) {
        return;
    }
    plantUmlStream.push(`\nnote over ${formatters_1.participantId(transaction.from)}\n`);
    plantUmlStream.push(`Nonce: ${transaction.nonce.toLocaleString()}\n`);
    plantUmlStream.push(`Gas Price: ${utils_1.formatUnits(transaction.gasPrice, "gwei")} Gwei\n`);
    plantUmlStream.push(`Gas Limit: ${formatters_1.formatNumber(transaction.gasLimit.toString())}\n`);
    plantUmlStream.push(`Gas Used: ${formatters_1.formatNumber(transaction.gasUsed.toString())}\n`);
    const txFeeInWei = transaction.gasUsed.mul(transaction.gasPrice);
    const txFeeInEther = utils_1.formatEther(txFeeInWei);
    const tFeeInEtherFormatted = Number(txFeeInEther).toLocaleString();
    plantUmlStream.push(`Tx Fee: ${tFeeInEtherFormatted} ETH\n`);
    plantUmlStream.push("end note\n");
};
const writeMessages = (plantUmlStream, traces, options = {}) => {
    if (!(traces === null || traces === void 0 ? void 0 : traces.length)) {
        return;
    }
    let contractCallStack = [];
    let previousTrace;
    plantUmlStream.push("\n");
    // for each trace
    for (const trace of traces) {
        debug(`Write message ${trace.id} from ${formatters_1.shortAddress(trace.from)} to ${formatters_1.shortAddress(trace.to)}`);
        // return from lifeline if processing has moved to a different contract
        if (trace.delegatedFrom !== (previousTrace === null || previousTrace === void 0 ? void 0 : previousTrace.to)) {
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
        if (trace.type === transaction_1.MessageType.Selfdestruct) {
            plantUmlStream.push(`${formatters_1.participantId(trace.from)} ${genArrow(trace)} ${formatters_1.participantId(trace.from)}: Self-Destruct\n`);
            // TODO add ETH value transfer to refund address if there was a contract balance
        }
        else {
            plantUmlStream.push(`${formatters_1.participantId(trace.from)} ${genArrow(trace)} ${formatters_1.participantId(trace.to)}: ${genFunctionText(trace, options.noParams)}${genGasUsage(trace.gasUsed, options.noGas)}${genEtherValue(trace, options.noEther)}\n`);
            if (trace.type === transaction_1.MessageType.DelegateCall) {
                plantUmlStream.push(`activate ${formatters_1.participantId(trace.to)} ${DelegateLifelineColor}\n`);
            }
            else {
                plantUmlStream.push(`activate ${formatters_1.participantId(trace.to)}\n`);
            }
        }
        if (trace.type !== transaction_1.MessageType.Selfdestruct) {
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
            plantUml += `return${exports.genParams(trace.outputParams)}\n`;
        }
        if (!options.noGas && trace.childTraces.length > 0) {
            const gasUsedLessChildCalls = calculateGasUsedLessChildTraces(trace);
            if (gasUsedLessChildCalls === null || gasUsedLessChildCalls === void 0 ? void 0 : gasUsedLessChildCalls.gt(0)) {
                plantUml += `note right of ${formatters_1.participantId(trace.to)}: ${genGasUsage(gasUsedLessChildCalls)}\n`;
            }
        }
    }
    else {
        // a failed transaction so end the lifeline
        plantUml += `destroy ${formatters_1.participantId(trace.to)}\nreturn\n`;
        plantUml += `note right of ${formatters_1.participantId(trace.to)} ${FailureFillColor}: ${trace.error}\n`;
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
    var _a;
    const arrowColor = ((_a = trace.parentTrace) === null || _a === void 0 ? void 0 : _a.type) === transaction_1.MessageType.DelegateCall
        ? `[${DelegateMessageColor}]`
        : "";
    const line = trace.proxy ? "--" : "-";
    if (trace.type === transaction_1.MessageType.DelegateCall) {
        return `${line}${arrowColor}>>`;
    }
    if (trace.type === transaction_1.MessageType.Create) {
        return `${line}${arrowColor}>o`;
    }
    if (trace.type === transaction_1.MessageType.Selfdestruct) {
        return `${line}${arrowColor}\\`;
    }
    // Call and Staticcall are the same
    return `${line}${arrowColor}>`;
};
const genFunctionText = (trace, noParams = false) => {
    if (!trace) {
        return "";
    }
    else if (trace.type === transaction_1.MessageType.Create) {
        return "create";
    }
    if (!trace.funcSelector) {
        return noParams ? "fallback" : "fallback()";
    }
    if (!trace.funcName) {
        return `${trace.funcSelector}`;
    }
    return noParams
        ? trace.funcName
        : `${trace.funcName}(${exports.genParams(trace.inputParams)})`;
};
const oneIndent = "  ";
const genParams = (params, plantUml = "", indent = "") => {
    if (!params) {
        return "";
    }
    for (const param of params) {
        // put each param on a new line.
        // The \ needs to be escaped with \\
        plantUml += "\\n" + indent;
        if (param.name) {
            plantUml += `${param.name}: `;
        }
        if (param.type === "address") {
            plantUml += `${formatters_1.shortAddress(param.value)},`;
        }
        else if (param.components) {
            if (Array.isArray(param.components)) {
                plantUml += `[`;
                plantUml = `${exports.genParams(param.components, plantUml, indent + oneIndent)}`;
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
                plantUml = `${exports.genParams([
                    {
                        name: i.toString(),
                        value,
                        // remove the [] at the end of the type
                        type: param.type.slice(0, -2),
                    },
                ], plantUml, indent + oneIndent)}`;
            });
            plantUml += `],`;
        }
        else if (param.type.slice(0, 5) === "bytes") {
            plantUml += `${formatters_1.shortBytes(param.value)},`;
        }
        else if (param.type.match("int")) {
            plantUml += `${formatters_1.formatNumber(param.value)},`;
        }
        else {
            plantUml += `${param.value},`;
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
    const gasValueWithCommas = formatters_1.formatNumber(gasUsed.toString());
    return `\\n${gasValueWithCommas} gas`;
};
const genEtherValue = (trace, noEtherValue = false) => {
    if (noEtherValue || trace.value.eq(0)) {
        return "";
    }
    // Convert wei value to Ether
    const ether = utils_1.formatEther(trace.value);
    // Add thousand commas. Can't use formatNumber for this as it doesn't handle decimal numbers.
    // Assuming the amount of ether is not great than JS number limit.
    const etherFormatted = Number(ether).toLocaleString();
    return `\\n${etherFormatted} ETH`;
};
const genCaption = (details, options) => {
    return `caption ${options.network || ""} ${details.timestamp.toUTCString()}`;
};
//# sourceMappingURL=plantUmlStreamer.js.map