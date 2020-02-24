"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const transaction_1 = require("./transaction");
exports.genPlantUml = (messages, contracts) => {
    let plantUml = "@startuml\n";
    plantUml += exports.genParticipants(contracts);
    plantUml += exports.genMessages(messages);
    plantUml += "\n@endumls";
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
    const contractCallStack = []; // array of contract addresses
    let previousMessage;
    let plantUml = "\n";
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
        if (message.type !== transaction_1.MessageType.Selfdestruct) {
            plantUml += `${exports.participantId(message.from)} ${genArrow(message)} ${exports.participantId(message.to)}: ${genMessageText(message, params)}\n`;
            plantUml += `activate ${exports.participantId(message.to)}\n`;
            contractCallStack.push(message.from);
        }
        else {
            plantUml += `return ${genMessageText(message, params)} \n`;
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
    if (!message.status) {
        return "-x";
    }
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
const genMessageText = (message, params = false) => {
    var _a, _b;
    if (message.type === transaction_1.MessageType.Value) {
        return `<< ${message.value} wei >>`;
    }
    if (message.type === transaction_1.MessageType.Selfdestruct) {
        return "selfdestruct";
    }
    if ((_a = message.payload) === null || _a === void 0 ? void 0 : _a.funcName) {
        const funcName = message.payload.funcName || "fallback";
        if (params) {
            return `${funcName}(${exports.genParams(message.payload.inputs)})`;
        }
        return funcName;
    }
    return `${(_b = message.payload) === null || _b === void 0 ? void 0 : _b.funcSelector}`;
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