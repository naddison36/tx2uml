"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const transaction_1 = require("./transaction");
const stream_1 = require("stream");
const debug = require("debug")("tx2uml");
const DelegateLifelineColor = "#809ECB";
const DelegateMessageColor = "#3471CD";
exports.streamPlantUml = (messages, contracts, details, options = {}) => {
    const pumlStream = new stream_1.Readable({
        read() { }
    });
    pumlStream.push(`@startuml\ntitle ${details.hash}\n`);
    pumlStream.push(genCaption(details, options));
    exports.writeParticipants(pumlStream, contracts);
    exports.writeMessages(pumlStream, messages, options);
    pumlStream.push("\n@endumls");
    pumlStream.push(null);
    return pumlStream;
};
exports.writeParticipants = (plantUmlStream, contracts) => {
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
        plantUmlStream.push(`participant "${exports.shortAddress(address)}" as ${exports.participantId(address)} ${name}\n`);
    }
};
exports.participantId = (address) => {
    return address.substr(2, 4) + address.substr(-4, 4);
};
exports.shortAddress = (address) => {
    return address.substr(0, 6) + ".." + address.substr(-4, 4);
};
exports.writeMessages = (plantUmlStream, messages, options = {}) => {
    var _a, _b, _c, _d, _e;
    if (!(messages === null || messages === void 0 ? void 0 : messages.length)) {
        return;
    }
    let contractCallStack = [];
    let previousMessage;
    plantUmlStream.push("\n");
    // for each contract message
    for (const message of messages) {
        debug(`id ${message.id}, parent ${message.parentId}, from ${exports.shortAddress(message.from)}, to ${exports.shortAddress(message.to)}, ${(_a = message === null || message === void 0 ? void 0 : message.payload) === null || _a === void 0 ? void 0 : _a.funcName} [${message.gasUsed}] ${(_b = message === null || message === void 0 ? void 0 : message.payload) === null || _b === void 0 ? void 0 : _b.funcSelector}, type ${message.type}, delegated call ${(_c = message.delegatedCall) === null || _c === void 0 ? void 0 : _c.id} last ${(_d = message.delegatedCall) === null || _d === void 0 ? void 0 : _d.last}`);
        // return from lifeline if processing has moved to a different contract
        // except when the previous message was a delegatecall
        if (previousMessage &&
            message.from !== previousMessage.to &&
            previousMessage.type !== transaction_1.MessageType.Delegatecall) {
            // reserve() is mutable so need to copy the array wih a spread operator
            const reservedCallStack = [...contractCallStack].reverse();
            for (const callStack of reservedCallStack) {
                plantUmlStream.push(genEndLifeline(callStack));
                contractCallStack.pop();
                // stop returns when the callstack is back to this message's lifeline
                if (message.from === callStack.from) {
                    break;
                }
            }
        }
        // if the previous message was the last delegated call
        if ((_e = previousMessage === null || previousMessage === void 0 ? void 0 : previousMessage.delegatedCall) === null || _e === void 0 ? void 0 : _e.last) {
            // return from the delegated lifeline
            plantUmlStream.push("return\n");
        }
        if (message.type === transaction_1.MessageType.Call ||
            message.type === transaction_1.MessageType.Create ||
            message.type === transaction_1.MessageType.Delegatecall) {
            // output call message
            plantUmlStream.push(`${exports.participantId(message.from)} ${genArrow(message)} ${exports.participantId(message.to)}: ${genFunctionText(message, options.params)}${genGasUsage(message, options.gas)}${genEtherValue(message, options.ether)}\n`);
            if (message.type === transaction_1.MessageType.Delegatecall) {
                plantUmlStream.push(`activate ${exports.participantId(message.to)} ${DelegateLifelineColor}\n`);
            }
            else {
                plantUmlStream.push(`activate ${exports.participantId(message.to)}\n`);
                contractCallStack.push(message);
            }
        }
        else if (message.type === transaction_1.MessageType.Value) {
            plantUmlStream.push(`${exports.participantId(message.from)} ${genArrow(message)} ${exports.participantId(message.to)}: ${message.value.toString()} ETH${genGasUsage(message, options.gas)}\n`);
            // we want to avoid a return in the next loop so setting previous message from field so no returns are printed
            if (previousMessage) {
                previousMessage.to = message.from;
            }
            continue;
        }
        else if (message.type === transaction_1.MessageType.Selfdestruct) {
            plantUmlStream.push(`return selfdestruct\n`);
            // selfdestruct is the return so pop the previous contract call
            contractCallStack.pop();
        }
        previousMessage = message;
    }
    contractCallStack.reverse().forEach(callStack => {
        plantUmlStream.push(genEndLifeline(callStack));
    });
};
const genEndLifeline = (message) => {
    let plantUml = "";
    if (message.status) {
        plantUml += `return\n`;
    }
    else {
        // a failed transaction so end the lifeline
        plantUml += `destroy ${exports.participantId(message.to)}\n`;
    }
    if (message.error) {
        plantUml += `note right of ${exports.participantId(message.to)}: ${message.error}\n`;
    }
    return plantUml;
};
const genArrow = (message) => {
    var _a;
    const arrowColor = isNaN((_a = message.delegatedCall) === null || _a === void 0 ? void 0 : _a.id)
        ? ""
        : `[${DelegateMessageColor}]`;
    if (message.type === transaction_1.MessageType.Call) {
        return `-${arrowColor}>`;
    }
    if (message.type === transaction_1.MessageType.Value) {
        return `-${arrowColor}>>`;
    }
    if (message.type === transaction_1.MessageType.Create) {
        return `-${arrowColor}>o`;
    }
    if (message.type === transaction_1.MessageType.Selfdestruct) {
        return `-${arrowColor}\\`;
    }
    return `-${arrowColor}>`;
};
const genFunctionText = (message, params = false) => {
    if (!(message === null || message === void 0 ? void 0 : message.payload)) {
        return "";
    }
    else if (message.type === transaction_1.MessageType.Create) {
        return "create";
    }
    const payload = message.payload;
    if (!payload.funcSelector) {
        return params ? "fallback()" : "fallback";
    }
    if (!payload.funcName) {
        return `${payload.funcSelector}`;
    }
    return params
        ? `${payload.funcName}(${exports.genParams(payload.inputs)})`
        : payload.funcName;
};
exports.genParams = (params, plantUml = "") => {
    if (!params) {
        return "";
    }
    for (const param of params) {
        if (param.name) {
            plantUml += `${param.name}: `;
        }
        if (param.type === "address") {
            plantUml += `${exports.shortAddress(param.value)}, `;
        }
        else if (param.components) {
            if (Array.isArray(param.components)) {
                plantUml += `[`;
                plantUml = exports.genParams(param.components, plantUml);
                plantUml += `], `;
            }
            else {
                debug(`Unsupported components type ${JSON.stringify(param.components)}`);
            }
        }
        else {
            plantUml += `${param.value}, `;
        }
    }
    return plantUml.slice(0, -2);
};
const genGasUsage = (message, gasUsage = false) => {
    if (!gasUsage) {
        return "";
    }
    return ` [${message.gasUsed}]`;
};
const genEtherValue = (message, etherValue = false) => {
    if (!etherValue || message.value.eq(0)) {
        return "";
    }
    return ` ${message.value.toString()} ETH`;
};
const genCaption = (details, options) => {
    return `caption ${options.network || ""} ${details.timestamp.toUTCString()} `;
    // `gas price ${details.gasPrice}, limit ${details.gasLimit}`
};
//# sourceMappingURL=plantUmlStreamer.js.map