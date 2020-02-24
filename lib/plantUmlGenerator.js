"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const transaction_1 = require("./transaction");
const bignumber_js_1 = __importDefault(require("bignumber.js"));
const debug = require("debug")("tx2uml");
exports.genPlantUml = (messages, contracts, details) => {
    let plantUml = `@startuml\ntitle ${details.hash}`;
    plantUml += exports.genParticipants(contracts);
    plantUml += exports.genMessages(messages);
    plantUml += "\n@endumls";
    debug(plantUml);
    return plantUml;
};
exports.genParticipants = (contracts) => {
    let plantUml = "\n";
    for (const [address, names] of Object.entries(contracts)) {
        if (names.contractName) {
            plantUml += `participant "${exports.shortAddress(address)}" as ${exports.participantId(address)} <<${names.contractName}>>\n`;
        }
        else {
            plantUml += `participant "${exports.shortAddress(address)}" as ${exports.participantId(address)}\n`;
        }
    }
    return plantUml;
};
exports.participantId = (address) => {
    return address.substr(2, 4) + address.substr(-4, 4);
};
exports.shortAddress = (address) => {
    return address.substr(0, 6) + ".." + address.substr(-4, 4);
};
exports.genMessages = (messages, params = false) => {
    if (!(messages === null || messages === void 0 ? void 0 : messages.length)) {
        return "";
    }
    let contractCallStack = []; // array of contract addresses
    let previousMessage;
    let plantUml = "\n";
    // for each contract call
    for (const message of messages) {
        if (previousMessage && message.from !== previousMessage.to) {
            // reserve() is mutable so need to copy the array wih a spread operator
            const reservedCallStack = [...contractCallStack].reverse();
            for (const contractAddress of reservedCallStack) {
                plantUml += `return\n`;
                contractCallStack.pop();
                if (message.from === contractAddress) {
                    break;
                }
            }
        }
        if (message.type === transaction_1.MessageType.Call ||
            message.type === transaction_1.MessageType.Create) {
            // output call message
            plantUml += `${exports.participantId(message.from)} ${genArrow(message)} ${exports.participantId(message.to)}: ${genFunctionText(message.payload, params)}\n`;
            plantUml += `activate ${exports.participantId(message.to)}\n`;
            // If a successful transaction
            if (message.status === true) {
                contractCallStack.push(message.from);
            }
            else {
                // a failed transaction so end the lifeline
                plantUml += `destroy ${exports.participantId(message.to)}\n`;
                if (message.error) {
                    plantUml += `note right: ${message.error}\n`;
                }
                // clear callstack as we don't want to output any more returns
                contractCallStack = [];
            }
        }
        else if (message.type === transaction_1.MessageType.Value) {
            // convert wei to Ethers which is to 18 decimal places
            const ethers = new bignumber_js_1.default(message.value.toString()).div(new bignumber_js_1.default(10).pow(18));
            plantUml += `${exports.participantId(message.from)} ${genArrow(message)} ${exports.participantId(message.to)}: ${ethers.toFormat(2)} ETH\n`;
        }
        else if (message.type === transaction_1.MessageType.Selfdestruct) {
            plantUml += `return selfdestruct\n`;
            // selfdestruct is the return so pop the previous contract call
            contractCallStack.pop();
        }
        previousMessage = message;
    }
    contractCallStack.reverse().forEach(() => {
        plantUml += `return\n`;
    });
    return plantUml;
};
const genArrow = (message) => {
    if (message.type === transaction_1.MessageType.Call) {
        return "->";
    }
    if (message.type === transaction_1.MessageType.Value) {
        return "->>";
    }
    if (message.type === transaction_1.MessageType.Create) {
        return "->o";
    }
    if (message.type === transaction_1.MessageType.Selfdestruct) {
        return "-\\";
    }
    return "->";
};
const genFunctionText = (payload, params = false) => {
    if (!payload) {
        return "";
    }
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
        if (param.type === " address") {
            plantUml += `${param.name}: ${exports.shortAddress(param.value)}, `;
        }
        else {
            plantUml += `${param.name}: ${param.value}, `;
        }
    }
    return plantUml.slice(0, -2);
};
//# sourceMappingURL=plantUmlGenerator.js.map