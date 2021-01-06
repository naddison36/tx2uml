"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TransactionManager = exports.MessageType = void 0;
const abi_1 = require("@ethersproject/abi");
const verror_1 = __importDefault(require("verror"));
const regEx_1 = require("./utils/regEx");
const p_limit_1 = __importDefault(require("p-limit"));
const debug = require("debug")("tx2uml");
var MessageType;
(function (MessageType) {
    MessageType[MessageType["Unknown"] = 0] = "Unknown";
    MessageType[MessageType["Call"] = 1] = "Call";
    MessageType[MessageType["Create"] = 2] = "Create";
    MessageType[MessageType["Selfdestruct"] = 3] = "Selfdestruct";
    MessageType[MessageType["DelegateCall"] = 4] = "DelegateCall";
    MessageType[MessageType["StaticCall"] = 5] = "StaticCall";
})(MessageType = exports.MessageType || (exports.MessageType = {}));
class TransactionManager {
    constructor(tracingClient, etherscanClient, ethereumNodeClient, 
    // 3 works for smaller contracts but Etherscan will rate limit on larger contracts when set to 3
    apiConcurrencyLimit = 2) {
        this.tracingClient = tracingClient;
        this.etherscanClient = etherscanClient;
        this.ethereumNodeClient = ethereumNodeClient;
        this.apiConcurrencyLimit = apiConcurrencyLimit;
    }
    async getTransactions(txHashes) {
        const transactions = [];
        for (const txHash of txHashes) {
            if (!(txHash === null || txHash === void 0 ? void 0 : txHash.match(regEx_1.transactionHash))) {
                console.error(`Array of transaction hashes must be in hexadecimal format with a 0x prefix`);
                process.exit(1);
            }
            transactions.push(await this.getTransaction(txHash));
        }
        return transactions;
    }
    async getTransaction(txHash) {
        return await this.ethereumNodeClient.getTransactionDetails(txHash);
    }
    async getTraces(transactions) {
        const transactionsTraces = [];
        for (const transaction of transactions) {
            transactionsTraces.push(await this.tracingClient.getTransactionTrace(transaction.hash));
        }
        return transactionsTraces;
    }
    async getContracts(transactionsTraces) {
        const flatTraces = transactionsTraces.flat();
        const participantAddresses = [];
        for (const trace of Object.values(flatTraces)) {
            // duplicates are ok. They will be filtered later
            participantAddresses.push(trace.from);
            participantAddresses.push(trace.to);
        }
        // get contract ABIs from Etherscan
        let contracts = await this.getContractsFromAddresses(participantAddresses);
        // identify proxy contracts from chain
        // contracts = await setProxyContracts(contracts, url)
        // Get token name and symbol from chain
        return await this.setTokenAttributes(contracts);
    }
    // Get the contract names and ABIs from Etherscan
    async getContractsFromAddresses(addresses) {
        const contracts = {};
        // Convert to a Set to remove duplicates and then back to an array
        const uniqueAddresses = Array.from(new Set(addresses));
        debug(`${uniqueAddresses.length} contracts in the transactions`);
        // Get the contract details in parallel with a concurrency limit
        const limit = p_limit_1.default(this.apiConcurrencyLimit);
        const getContractPromises = uniqueAddresses.map(address => {
            return limit(() => this.etherscanClient.getContract(address));
        });
        const results = await Promise.all(getContractPromises);
        results.forEach(result => {
            contracts[result.address] = result;
        });
        return contracts;
    }
    async setTokenAttributes(contracts) {
        // get the token details in parallel
        const tokensDetailsPromises = Object.values(contracts).map(contract => {
            var _a, _b, _c, _d;
            if (((_b = (_a = contract.ethersContract) === null || _a === void 0 ? void 0 : _a.interface) === null || _b === void 0 ? void 0 : _b.functions["symbol()"]) && ((_d = (_c = contract.ethersContract) === null || _c === void 0 ? void 0 : _c.interface) === null || _d === void 0 ? void 0 : _d.functions["name()"])) {
                return this.ethereumNodeClient.getTokenDetailsKnownABI(contract.ethersContract);
            }
            return this.ethereumNodeClient.getTokenDetailsUnknownABI(contract.address);
        });
        const tokensDetails = await Promise.all(tokensDetailsPromises);
        tokensDetails.forEach(tokenDetails => {
            contracts[tokenDetails.address].tokenName = tokenDetails.name;
            contracts[tokenDetails.address].symbol = tokenDetails.symbol;
        });
        return contracts;
    }
    static parseTraceParams(traces, contracts) {
        var _a;
        const functionSelector2Contract = mapFunctionSelectors2Contracts(contracts);
        for (const trace of traces.flat()) {
            if (((_a = trace.inputs) === null || _a === void 0 ? void 0 : _a.length) >= 10) {
                if (trace.type === MessageType.Create) {
                    trace.funcName = "constructor";
                    addConstructorParamsToTrace(trace, contracts);
                    return;
                }
                const selectedContracts = functionSelector2Contract[trace.funcSelector];
                if ((selectedContracts === null || selectedContracts === void 0 ? void 0 : selectedContracts.length) > 0) {
                    // get the contract for the function selector that matches the to address
                    let contract = selectedContracts.find(contract => contract.address === trace.to);
                    // if the function is not on the `to` contract, then its a proxy contract
                    // so just use any contract if the function is on another contract
                    if (!contract) {
                        contract = selectedContracts[0];
                        trace.proxy = true;
                    }
                    try {
                        const txDescription = contract.interface.parseTransaction({
                            data: trace.inputs,
                        });
                        trace.funcName = txDescription.name;
                        addInputParamsToTrace(trace, txDescription);
                        addOutputParamsToTrace(trace, txDescription);
                    }
                    catch (err) {
                        if (!err.message.match("no matching function")) {
                            throw new verror_1.default(err, `Failed to parse trace with id ${trace.id} selector ${trace.funcSelector}`);
                        }
                    }
                }
            }
        }
    }
}
exports.TransactionManager = TransactionManager;
// map of function selectors to Ethers Contracts
const mapFunctionSelectors2Contracts = (contracts) => {
    // map of function selectors to Ethers Contracts
    const functionSelector2Contract = {};
    // For each contract, get function selectors
    Object.values(contracts).forEach(contract => {
        if (contract.ethersContract) {
            Object.values(contract.ethersContract.interface.fragments)
                .filter(fragment => fragment.type === "function")
                .forEach((fragment) => {
                const sighash = contract.ethersContract.interface.getSighash(fragment);
                if (!functionSelector2Contract[sighash]) {
                    functionSelector2Contract[sighash] = [];
                }
                functionSelector2Contract[sighash].push(contract.ethersContract);
            });
        }
    });
    return functionSelector2Contract;
};
const addInputParamsToTrace = (trace, txDescription) => {
    // For each function argument, add to the trace input params
    txDescription.args.forEach((arg, i) => {
        const functionFragment = txDescription.functionFragment.inputs[i];
        const components = addValuesToComponents(functionFragment, arg);
        trace.inputParams.push({
            name: functionFragment.name,
            type: functionFragment.type,
            value: arg,
            components,
        });
    });
};
const addOutputParamsToTrace = (trace, txDescription) => {
    // Undefined outputs can happen with failed transactions
    if (!trace.outputs || trace.outputs === "0x" || trace.error)
        return;
    const functionFragments = txDescription.functionFragment.outputs;
    const outputParams = abi_1.defaultAbiCoder.decode(functionFragments, trace.outputs);
    // For each output, add to the trace output params
    outputParams.forEach((param, i) => {
        const components = addValuesToComponents(functionFragments[i], param);
        trace.outputParams.push({
            name: functionFragments[i].name,
            type: functionFragments[i].type,
            value: param,
            components,
        });
    });
    debug(`Decoded ${trace.outputParams.length} output params for ${trace.funcName} with selector ${trace.funcSelector}`);
};
const addConstructorParamsToTrace = (trace, contracts) => {
    var _a, _b, _c, _d, _e, _f;
    // Do we have the ABI for the deployed contract?
    const constructor = (_c = (_b = (_a = contracts[trace.to]) === null || _a === void 0 ? void 0 : _a.ethersContract) === null || _b === void 0 ? void 0 : _b.interface) === null || _c === void 0 ? void 0 : _c.deploy;
    if (!(constructor === null || constructor === void 0 ? void 0 : constructor.inputs)) {
        // No ABI so we don't know the constructor params which comes from verified contracts on Etherscan
        return;
    }
    // we need this flag to determine if there was no constructor params or they are unknown
    trace.parsedConstructorParams = true;
    // if we don't have the ABI then we won't have the constructorInputs but we'll double check anyway
    if (!((_e = (_d = contracts[trace.to]) === null || _d === void 0 ? void 0 : _d.constructorInputs) === null || _e === void 0 ? void 0 : _e.length)) {
        return;
    }
    const constructorParams = abi_1.defaultAbiCoder.decode(constructor.inputs, "0x" + ((_f = contracts[trace.to]) === null || _f === void 0 ? void 0 : _f.constructorInputs));
    // For each constructor param, add to the trace input params
    constructorParams.forEach((param, i) => {
        const components = addValuesToComponents(constructor.inputs[i], param);
        trace.inputParams.push({
            name: constructor.inputs[i].name,
            type: constructor.inputs[i].type,
            value: param,
            components,
        });
    });
    debug(`Decoded ${trace.inputParams.length} constructor params.`);
};
// if function components exists, recursively add arg values to the function components
const addValuesToComponents = (paramType, args) => {
    if (paramType.baseType !== "array") {
        if (!(paramType === null || paramType === void 0 ? void 0 : paramType.components)) {
            return undefined;
        }
        // For each component
        return paramType.components.map((component, j) => {
            // add the value and recursively add the components
            return {
                name: component.name,
                type: component.type,
                value: args[j],
                components: addValuesToComponents(component, args[j]),
            };
        });
    }
    else {
        // If an array of components
        return args.map((row, r) => {
            // Remove the last two [] characters from the type.
            // For example, tuple[] becomes tuple and tuple[][] becomes tuple[]
            const childType = paramType.type.slice(0, -2);
            // If a multi dimensional array then the baseType is still an array. Otherwise it becomes a tuple
            const childBaseType = childType.slice(-2) === "[]" ? "array" : childType;
            const components = addValuesToComponents({ ...paramType, type: childType, baseType: childBaseType }, row);
            return {
                name: r.toString(),
                type: childType,
                value: row,
                components,
            };
        });
    }
};
//# sourceMappingURL=transaction.js.map