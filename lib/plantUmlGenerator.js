"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const transaction_1 = require("./transaction");
const bignumber_js_1 = __importDefault(require("bignumber.js"));
const debug = require("debug")("tx2uml");
const DelegateLifelineColor = "#809ECB";
const DelegateMessageColor = "#3471CD";
exports.genPlantUml = (messages, contracts, details, options = {}) => {
    let plantUml = `@startuml\ntitle ${options.network || ""} ${details.hash}`;
    plantUml += exports.genParticipants(contracts);
    plantUml += exports.genMessages(messages, options);
    plantUml += "\n@endumls";
    debug(plantUml);
    return plantUml;
};
exports.genParticipants = (contracts) => {
    let plantUml = "\n";
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
        plantUml += `participant "${exports.shortAddress(address)}" as ${exports.participantId(address)} ${name}\n`;
    }
    return plantUml;
};
exports.participantId = (address) => {
    return address.substr(2, 4) + address.substr(-4, 4);
};
exports.shortAddress = (address) => {
    return address.substr(0, 6) + ".." + address.substr(-4, 4);
};
exports.genMessages = (messages, options = {}) => {
    var _a, _b, _c, _d, _e;
    if (!(messages === null || messages === void 0 ? void 0 : messages.length)) {
        return "";
    }
    let contractCallStack = [];
    let previousMessage;
    let plantUml = "\n";
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
                plantUml += genEndLifeline(callStack);
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
            plantUml += "return\n";
        }
        if (message.type === transaction_1.MessageType.Call ||
            message.type === transaction_1.MessageType.Create ||
            message.type === transaction_1.MessageType.Delegatecall) {
            // output call message
            plantUml += `${exports.participantId(message.from)} ${genArrow(message)} ${exports.participantId(message.to)}: ${genFunctionText(message, options.params)}${genGasUsage(message, options.gas)}\n`;
            if (message.type === transaction_1.MessageType.Delegatecall) {
                plantUml += `activate ${exports.participantId(message.to)} ${DelegateLifelineColor}\n`;
            }
            else {
                plantUml += `activate ${exports.participantId(message.to)}\n`;
                contractCallStack.push(message);
            }
        }
        else if (message.type === transaction_1.MessageType.Value) {
            // convert wei to Ethers which is to 18 decimal places
            const ethers = new bignumber_js_1.default(message.value.toString()).div(new bignumber_js_1.default(10).pow(18));
            plantUml += `${exports.participantId(message.from)} ${genArrow(message)} ${exports.participantId(message.to)}: ${ethers.toFormat(2)} ETH${genGasUsage(message, options.gas)}\n`;
            // we want to avoid a return in the next loop so setting previous message from field so no returns are printed
            if (previousMessage) {
                previousMessage.to = message.from;
            }
            continue;
        }
        else if (message.type === transaction_1.MessageType.Selfdestruct) {
            plantUml += `return selfdestruct\n`;
            // selfdestruct is the return so pop the previous contract call
            contractCallStack.pop();
        }
        previousMessage = message;
    }
    contractCallStack.reverse().forEach(callStack => {
        plantUml += genEndLifeline(callStack);
    });
    return plantUml;
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
    const delegateColor = isNaN((_a = message.delegatedCall) === null || _a === void 0 ? void 0 : _a.id)
        ? ""
        : `[${DelegateMessageColor}]`;
    if (message.type === transaction_1.MessageType.Call) {
        return `-${delegateColor}>`;
    }
    if (message.type === transaction_1.MessageType.Value) {
        return `-${delegateColor}>>`;
    }
    if (message.type === transaction_1.MessageType.Create) {
        return `-${delegateColor}>o`;
    }
    if (message.type === transaction_1.MessageType.Selfdestruct) {
        return `-${delegateColor}\\`;
    }
    return `-${delegateColor}>`;
};
const genFunctionText = (message, params = false) => {
    if (!(message === null || message === void 0 ? void 0 : message.payload)) {
        return "";
    }
    else if (message.type === transaction_1.MessageType.Create) {
        return "create";
    }
    const payload = message.payload;
    if (payload.funcName) {
        const funcName = payload.funcName || "fallback";
        if (params) {
            return `${funcName}(${exports.genParams(payload.inputs)})`;
        }
        return funcName;
    }
    return `${payload.funcSelector}`;
};
exports.genParams = (params) => {
    if (!params) {
        return "";
    }
    let plantUml = "";
    for (const param of params) {
        if (param.type === "address") {
            plantUml += `${param.name}: ${exports.shortAddress(param.value)}, `;
        }
        else {
            plantUml += `${param.name}: ${param.value}, `;
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
//# sourceMappingURL=plantUmlGenerator.js.map