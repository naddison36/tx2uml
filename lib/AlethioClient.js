"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = __importDefault(require("axios"));
const verror_1 = require("verror");
const transaction_1 = require("./transaction");
const regEx_1 = require("./regEx");
const utils_1 = require("./utils");
const debug = require("debug")("tx2uml");
const alethioBaseUrls = {
    mainnet: "https://api.aleth.io/v1",
    ropsten: "https://api.ropsten.aleth.io/v1",
    rinkeby: "https://api.rinkebyaleth.io/v1",
    kovan: "https://api.kovan.aleth.io/v1"
};
exports.getTransactionDetails = async (txHash, apiKey, network = "mainnet") => {
    var _a, _b, _c, _d;
    if (!(txHash === null || txHash === void 0 ? void 0 : txHash.match(regEx_1.transactionHash))) {
        throw new TypeError(`Transaction hash "${txHash}" must be 32 bytes in hexadecimal format with a 0x prefix`);
    }
    const url = `${alethioBaseUrls[network]}/transactions/${txHash}`;
    try {
        if (apiKey) {
            axios_1.default.defaults.headers.common["Authorization"] = `Bearer ${apiKey}`;
        }
        const response = await axios_1.default.get(url);
        if (!((_b = (_a = response === null || response === void 0 ? void 0 : response.data) === null || _a === void 0 ? void 0 : _a.data) === null || _b === void 0 ? void 0 : _b.attributes)) {
            throw new Error(`no transaction attributes in Alethio response: ${response === null || response === void 0 ? void 0 : response.data}`);
        }
        if (!((_d = (_c = response === null || response === void 0 ? void 0 : response.data) === null || _c === void 0 ? void 0 : _c.data) === null || _d === void 0 ? void 0 : _d.relationships)) {
            throw new Error(`no transaction relationships in Alethio response: ${response === null || response === void 0 ? void 0 : response.data}`);
        }
        const attributes = response.data.data.attributes;
        const relationships = response.data.data.relationships;
        const details = {
            hash: txHash,
            nonce: attributes.txNonce,
            index: attributes.txIndex,
            value: BigInt(attributes.value),
            gasPrice: BigInt(attributes.txGasPrice),
            gasLimit: BigInt(attributes.msgGasLimit),
            timestamp: new Date(attributes.blockCreationTime * 1000),
            status: !attributes.msgError,
            error: attributes.msgErrorString
        };
        const firstMessage = {
            id: 0,
            type: convertType(attributes.msgType),
            from: relationships.from.data.id,
            to: relationships.to.data.id,
            value: BigInt(attributes.value),
            payload: attributes.msgPayload,
            gasUsed: BigInt(attributes.txGasUsed),
            gasLimit: BigInt(attributes.msgGasLimit),
            callDepth: 0,
            status: !attributes.msgError,
            error: attributes.msgErrorString
        };
        debug(`Got tx details and first message from Alethio:\ndetails: ${utils_1.stringify(details)}\nfirst message: ${utils_1.stringify(firstMessage)}`);
        return [details, firstMessage];
    }
    catch (err) {
        throw new verror_1.VError(err, `Failed to get transaction details for hash ${txHash} from Alethio using url ${url}`);
    }
};
exports.getContractMessages = async (txHash, apiKey, network = "mainnet") => {
    var _a, _b, _c, _d, _e, _f, _g, _h;
    if (!(txHash === null || txHash === void 0 ? void 0 : txHash.match(regEx_1.transactionHash))) {
        throw new TypeError(`Transaction hash "${txHash}" must be 32 bytes in hexadecimal format with a 0x prefix`);
    }
    const url = `${alethioBaseUrls[network]}/transactions/${txHash}/contractMessages`;
    let messages = [];
    try {
        if (apiKey) {
            axios_1.default.defaults.headers.common["Authorization"] = `Bearer ${apiKey}`;
        }
        const response = await axios_1.default.get(url);
        if (!Array.isArray((_a = response === null || response === void 0 ? void 0 : response.data) === null || _a === void 0 ? void 0 : _a.data)) {
            throw new Error(`no contract messages in Alethio response ${response === null || response === void 0 ? void 0 : response.data}`);
        }
        for (const contractMessage of response.data.data) {
            const parentId = (_e = (_d = (_c = (_b = contractMessage.relationships.parentContractMessage) === null || _b === void 0 ? void 0 : _b.data) === null || _c === void 0 ? void 0 : _c.id) === null || _d === void 0 ? void 0 : _d.split(":")) === null || _e === void 0 ? void 0 : _e.pop();
            messages.push({
                id: contractMessage.attributes.cmsgIndex,
                type: convertType(contractMessage.attributes.msgType),
                from: contractMessage.relationships.from.data.id,
                to: contractMessage.relationships.to.data.id,
                parentId: parentId ? parseInt(parentId) : parentId,
                value: BigInt(contractMessage.attributes.value),
                payload: contractMessage.attributes.msgPayload,
                gasUsed: BigInt(contractMessage.attributes.msgGasUsed),
                gasLimit: BigInt(contractMessage.attributes.msgGasLimit),
                callDepth: contractMessage.attributes.msgCallDepth,
                status: !contractMessage.attributes.msgError,
                error: contractMessage.attributes.msgErrorString
            });
        }
        debug(`Got ${messages.length} messages from Alethio`);
        // handle more than 100 contract messages
        if ((_h = (_g = (_f = response.data) === null || _f === void 0 ? void 0 : _f.meta) === null || _g === void 0 ? void 0 : _g.page) === null || _h === void 0 ? void 0 : _h.hasNext) {
            const nextCursor = response.data.links.next.split("=").pop();
            messages = await getContractMessagesRecursive(txHash, nextCursor, messages);
        }
        return identifyDelegateCalls(messages);
    }
    catch (err) {
        throw new verror_1.VError(err, `Failed to get contract messages for transaction hash ${txHash} from Alethio at url ${url}`);
    }
};
const getContractMessagesRecursive = async (txHash, cursor, messages = [], apiKey, network = "mainnet") => {
    var _a, _b, _c, _d, _e, _f, _g, _h;
    if (!(txHash === null || txHash === void 0 ? void 0 : txHash.match(regEx_1.transactionHash))) {
        throw new TypeError(`Transaction hash "${txHash}" must be 32 bytes in hexadecimal format with a 0x prefix`);
    }
    if (!cursor) {
        throw new TypeError(`Missing Alethio pagination cursor "${cursor}"`);
    }
    const url = `${alethioBaseUrls[network]}/transactions/${txHash}/contractMessages`;
    let cursorMessages = [];
    try {
        if (apiKey) {
            axios_1.default.defaults.headers.common["Authorization"] = `Bearer ${apiKey}`;
        }
        const response = await axios_1.default.get(url, {
            params: {
                "page[limit]": 100,
                "page[next]": cursor
            }
        });
        if (!Array.isArray((_a = response === null || response === void 0 ? void 0 : response.data) === null || _a === void 0 ? void 0 : _a.data)) {
            throw new Error(`no contract messages in Alethio response ${response === null || response === void 0 ? void 0 : response.data}`);
        }
        for (const contractMessage of response.data.data) {
            const parentId = (_e = (_d = (_c = (_b = contractMessage.relationships.parentContractMessage) === null || _b === void 0 ? void 0 : _b.data) === null || _c === void 0 ? void 0 : _c.id) === null || _d === void 0 ? void 0 : _d.split(":")) === null || _e === void 0 ? void 0 : _e.pop();
            cursorMessages.push({
                id: contractMessage.attributes.cmsgIndex,
                type: convertType(contractMessage.attributes.msgType),
                from: contractMessage.relationships.from.data.id,
                to: contractMessage.relationships.to.data.id,
                parentId: parentId ? parseInt(parentId) : parentId,
                value: BigInt(contractMessage.attributes.value),
                payload: contractMessage.attributes.msgPayload,
                gasUsed: BigInt(contractMessage.attributes.msgGasUsed),
                gasLimit: BigInt(contractMessage.attributes.msgGasLimit),
                callDepth: contractMessage.attributes.msgCallDepth,
                status: !contractMessage.attributes.msgError,
                error: contractMessage.attributes.msgErrorString
            });
        }
        const allMessages = messages.concat(cursorMessages);
        debug(`Got ${cursorMessages.length} messages of ${allMessages.length} for cursor ${cursor} from Alethio`);
        // handle more than 100 contract messages
        if ((_h = (_g = (_f = response.data) === null || _f === void 0 ? void 0 : _f.meta) === null || _g === void 0 ? void 0 : _g.page) === null || _h === void 0 ? void 0 : _h.hasNext) {
            const nextCursor = response.data.links.next.split("=").pop();
            return getContractMessagesRecursive(txHash, nextCursor, allMessages);
        }
        return allMessages;
    }
    catch (err) {
        throw new verror_1.VError(err, `Failed to get contract messages for transaction hash ${txHash} from Alethio`);
    }
};
// identifies delegate calls where the parent's to does NOT equal the child's from
// sets the message type on the delegatecall messages and delegatedCall on the child messages
const identifyDelegateCalls = (messages) => {
    try {
        // sort by contract message id
        messages = messages.sort((a, b) => a.id - b.id);
        const delegateCounts = {};
        messages.forEach((message, i) => {
            if (!isNaN(message.parentId)) {
                // if message's from not equal to parent's to
                if (messages[i].from !== messages[message.parentId - 1].to) {
                    messages[message.parentId - 1].type = transaction_1.MessageType.Delegatecall;
                    if (!delegateCounts[message.parentId]) {
                        delegateCounts[message.parentId] = 0;
                    }
                    messages[i].delegatedCall = {
                        id: delegateCounts[message.parentId]++,
                        last: false
                    };
                }
            }
        });
        // set the last child delegated call
        const delegateCallIds = Object.keys(delegateCounts).map(id => parseInt(id));
        for (const parentId of delegateCallIds) {
            const delegatedCalls = messages.filter(m => m.parentId === parentId);
            const lastCallId = delegatedCalls[delegatedCalls.length - 1].id;
            messages[lastCallId - 1].delegatedCall.last = true;
            debug(`id ${parentId} is a delegatecall. Last child call has id ${lastCallId}`);
        }
        debug(`${messages.length} messages in total from Alethio. ${delegateCallIds.length} delegate calls`);
        return messages;
    }
    catch (err) {
        throw new verror_1.VError(err, `Failed to initialise the ${messages.length} Alethio messages.`);
    }
};
const convertType = (msgType) => {
    let type = transaction_1.MessageType.Call;
    if (msgType === "ValueContractMsg" || msgType === "ValueTx") {
        type = transaction_1.MessageType.Value;
    }
    else if (msgType === "CreateContractMsg" || msgType === "CreateTx") {
        type = transaction_1.MessageType.Create;
    }
    else if (msgType === "SelfdestructContractMsg" ||
        msgType === "SelfdestructTx") {
        type = transaction_1.MessageType.Selfdestruct;
    }
    return type;
};
exports.getToken = async (contractAddress, apiKey, network = "mainnet") => {
    var _a, _b, _c;
    if (!(contractAddress === null || contractAddress === void 0 ? void 0 : contractAddress.match(regEx_1.ethereumAddress))) {
        throw new TypeError(`Contract address "${contractAddress}" must be 20 bytes in hexadecimal format with a 0x prefix`);
    }
    const url = `${alethioBaseUrls[network]}/tokens/${contractAddress}`;
    try {
        if (apiKey) {
            axios_1.default.defaults.headers.common["Authorization"] = `Bearer ${apiKey}`;
        }
        const response = await axios_1.default.get(url);
        if (!((_b = (_a = response === null || response === void 0 ? void 0 : response.data) === null || _a === void 0 ? void 0 : _a.data) === null || _b === void 0 ? void 0 : _b.attributes)) {
            throw new Error(`no token attributes in Alethio response: ${response === null || response === void 0 ? void 0 : response.data}`);
        }
        const attributes = response.data.data.attributes;
        const token = {
            address: contractAddress,
            name: attributes.name,
            symbol: attributes.symbol,
            decimals: attributes.decimals,
            totalSupply: BigInt(attributes.totalSupply)
        };
        debug(`Got token from Alethio: ${utils_1.stringify(token)}`);
        return token;
    }
    catch (err) {
        if (((_c = err === null || err === void 0 ? void 0 : err.response) === null || _c === void 0 ? void 0 : _c.status) === 404) {
            debug(`Could not find token details for contract ${contractAddress} from Alethio`);
            return null;
        }
        throw new verror_1.VError(err, `Failed to get token for address ${contractAddress} from Alethio using url ${url}`);
    }
};
//# sourceMappingURL=AlethioClient.js.map