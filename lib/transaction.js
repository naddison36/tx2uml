"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TransactionManager = exports.MessageType = void 0;
const abi_1 = require("@ethersproject/abi");
const p_limit_1 = __importDefault(require("p-limit"));
const verror_1 = __importDefault(require("verror"));
const regEx_1 = require("./utils/regEx");
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
    constructor(ethereumNodeClient, etherscanClient, 
    // 3 works for smaller contracts but Etherscan will rate limit on larger contracts when set to 3
    apiConcurrencyLimit = 2) {
        this.ethereumNodeClient = ethereumNodeClient;
        this.etherscanClient = etherscanClient;
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
        return this.ethereumNodeClient.getTransactionDetails(txHash);
    }
    async getTraces(transactions) {
        const transactionsTraces = [];
        for (const transaction of transactions) {
            transactionsTraces.push(await this.ethereumNodeClient.getTransactionTrace(transaction.hash));
        }
        return transactionsTraces;
    }
    async getContracts(transactionsTraces) {
        const flatTraces = transactionsTraces.flat();
        const participantAddresses = [];
        // for each contract, maps all the contract addresses it can delegate to.
        // eg maps from a proxy contract to an implementation
        // or maps a contract calls for many libraries
        const delegatesToContracts = {};
        for (const trace of Object.values(flatTraces)) {
            // duplicates are ok. They will be filtered later
            participantAddresses.push(trace.from);
            participantAddresses.push(trace.to);
            // If trace is a delegate call
            if (trace.type === MessageType.DelegateCall) {
                // If not already mapped to calling contract
                if (!delegatesToContracts[trace.from]) {
                    // Start a new list of contracts that are delegated to
                    delegatesToContracts[trace.from] = [trace.to];
                }
                else if (
                // if contract has already been mapped and
                // contract it delegates to has not already added
                !delegatesToContracts[trace.from].includes(trace.to)) {
                    // Add the contract being called to the existing list of contracts that are delegated to
                    delegatesToContracts[trace.from].push(trace.to);
                }
            }
        }
        // Convert to a Set to remove duplicates and then back to an array
        const uniqueAddresses = Array.from(new Set(participantAddresses));
        debug(`${uniqueAddresses.length} contracts in the transactions`);
        // get contract ABIs from Etherscan
        const contracts = await this.getContractsFromAddresses(uniqueAddresses);
        // map the delegatedToContracts on each contract
        for (const [address, toAddresses] of Object.entries(delegatesToContracts)) {
            contracts[address].delegatedToContracts =
                // map the to addresses to Contract objects
                // with the address of the contract the delegate call is coming from
                toAddresses.map(toAddress => ({
                    ...contracts[toAddress],
                    address,
                }));
        }
        // Get token name and symbol from chain
        return await this.setTokenAttributes(contracts);
    }
    // Get the contract names and ABIs from Etherscan
    async getContractsFromAddresses(addresses) {
        const contracts = {};
        // Get the contract details in parallel with a concurrency limit
        const limit = (0, p_limit_1.default)(this.apiConcurrencyLimit);
        const getContractPromises = addresses.map(address => {
            return limit(() => this.etherscanClient.getContract(address));
        });
        const results = await Promise.all(getContractPromises);
        results.forEach(result => {
            contracts[result.address] = result;
        });
        return contracts;
    }
    async setTokenAttributes(contracts) {
        // get the token details
        const contractAddresses = Object.keys(contracts);
        const tokensDetails = await this.ethereumNodeClient.getTokenDetails(contractAddresses);
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
                            const error = new verror_1.default(err, `Failed to parse selector ${trace.funcSelector} in trace with id ${trace.id} from ${trace.from} to ${trace.to}`);
                            console.warn(error);
                        }
                    }
                }
            }
        }
    }
    static parseTransactionLogs(logs, contracts) {
        var _a;
        // for each tx log
        for (const log of logs) {
            // see if we have the contract source for the log
            const contract = contracts[log.address.toLowerCase()];
            if (contract === null || contract === void 0 ? void 0 : contract.ethersContract) {
                // try and parse the log topic
                try {
                    const event = contract.ethersContract.interface.parseLog(log);
                    contract.events.push(parseEvent(contract, event));
                }
                catch (err) {
                    debug(`Failed to parse log with topic ${log === null || log === void 0 ? void 0 : log.topics[0]} on contract ${log.address}`);
                }
            }
            // also parse the events on any contracts that are delegated to
            (_a = contract === null || contract === void 0 ? void 0 : contract.delegatedToContracts) === null || _a === void 0 ? void 0 : _a.forEach(delegatedToContract => {
                // try and parse the log topic
                try {
                    const event = delegatedToContract.ethersContract.interface.parseLog(log);
                    contract.events.push(parseEvent(contract, event));
                }
                catch (err) {
                    debug(`Failed to parse log with topic ${log === null || log === void 0 ? void 0 : log.topics[0]} on contract ${log.address}`);
                }
            });
        }
    }
    // Marks each contract the minimum call depth it is used in
    static parseTraceDepths(traces, contracts) {
        const flatTraces = traces.flat();
        contracts[flatTraces[0].from].minDepth = 0;
        for (const trace of flatTraces) {
            if (contracts[trace.to].minDepth == undefined ||
                trace.depth < contracts[trace.to].minDepth) {
                contracts[trace.to].minDepth = trace.depth;
            }
        }
    }
    // Filter out delegated calls from proxies to their implementations
    // and remove any excluded contracts
    static filterTransactionTraces(transactionTraces, contracts, options) {
        const filteredTransactionTraces = transactionTraces.map(t => []);
        let usedAddresses = new Set();
        // For each transaction
        transactionTraces.forEach((tx, i) => {
            // recursively remove any calls to excluded contracts
            const filteredExcludedTraces = filterExcludedContracts(tx[0], options.excludedContracts);
            // recursively get a tree of traces without delegated calls
            const filteredTraces = options.noDelegates
                ? filterOutDelegatedTraces(filteredExcludedTraces)
                : [filteredExcludedTraces];
            filteredTransactionTraces[i] = arrayifyTraces(filteredTraces[0]);
            // Add the tx sender to set of used addresses
            usedAddresses.add(filteredTransactionTraces[i][0].from);
            // Add all the to addresses of all the trades to the set of used addresses
            filteredTransactionTraces[i].forEach(t => usedAddresses.add(t.to));
        });
        // Filter out contracts that are no longer used from filtered out traces
        const usedContracts = {};
        Array.from(usedAddresses).forEach(address => (usedContracts[address] = contracts[address]));
        return [filteredTransactionTraces, usedContracts];
    }
}
exports.TransactionManager = TransactionManager;
// Recursively filter out delegate calls from proxies or libraries depending on options
const filterOutDelegatedTraces = (trace, lastValidParentTrace // there can be multiple traces removed
) => {
    // If parent trace was a proxy
    const removeTrace = trace.type === MessageType.DelegateCall;
    const parentTrace = removeTrace
        ? // set to the last parent not removed
            lastValidParentTrace
        : // parent is not a proxy so is included
            { ...trace.parentTrace, type: MessageType.Call };
    // filter the child traces
    let filteredChildren = [];
    trace.childTraces.forEach(child => {
        filteredChildren = filteredChildren.concat(filterOutDelegatedTraces(child, parentTrace));
    });
    // if trace is being removed, return child traces so this trace is removed
    if (removeTrace) {
        return filteredChildren;
    }
    // else, attach child traces to copied trace and return in array
    return [
        {
            ...trace,
            proxy: false,
            childTraces: filteredChildren,
            parentTrace: lastValidParentTrace,
            depth: ((lastValidParentTrace === null || lastValidParentTrace === void 0 ? void 0 : lastValidParentTrace.depth) || 0) + 1,
            delegatedFrom: trace.from,
            type: removeTrace ? MessageType.Call : trace.type,
        },
    ];
};
// Recursively filter out any calls to excluded contracts
const filterExcludedContracts = (trace, excludedContracts = []) => {
    // filter the child traces
    let filteredChildren = [];
    trace.childTraces.forEach(child => {
        // If the child trace is a call to an excluded contract, then skip it
        if (excludedContracts.includes(child.to))
            return;
        filteredChildren = filteredChildren.concat(filterExcludedContracts(child, excludedContracts));
    });
    return {
        ...trace,
        childTraces: filteredChildren,
    };
};
const arrayifyTraces = (trace) => {
    let traces = [trace];
    trace.childTraces.forEach(child => {
        const arrayifiedChildren = arrayifyTraces(child);
        traces = traces.concat(arrayifiedChildren);
    });
    return traces;
};
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
const parseEvent = (contract, log) => {
    const params = [];
    // For each event param
    log.eventFragment.inputs.forEach((param, i) => {
        const components = addValuesToComponents(log.eventFragment.inputs[i], param);
        params.push({
            name: log.eventFragment.inputs[i].name,
            type: log.eventFragment.inputs[i].type,
            value: log.args[i],
            components,
        });
    });
    return {
        name: log.name,
        params,
    };
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