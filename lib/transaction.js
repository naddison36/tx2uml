"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TransactionManager = void 0;
const ethers_1 = require("ethers");
const abi_1 = require("@ethersproject/abi");
const p_limit_1 = __importDefault(require("p-limit"));
const config_1 = require("./config");
const tx2umlTypes_1 = require("./types/tx2umlTypes");
const labels_1 = require("./utils/labels");
const address_1 = require("@ethersproject/address");
const debug = require("debug")("tx2uml");
class TransactionManager {
    constructor(ethereumNodeClient, etherscanClient, 
    // 3 works for smaller contracts but Etherscan will rate limit on larger contracts when set to 3
    apiConcurrencyLimit = 1) {
        this.ethereumNodeClient = ethereumNodeClient;
        this.etherscanClient = etherscanClient;
        this.apiConcurrencyLimit = apiConcurrencyLimit;
    }
    async getTransactions(txHashes, network) {
        const transactions = [];
        for (const txHash of txHashes) {
            const tx = await this.getTransaction(txHash);
            transactions.push({ ...tx, network });
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
    static parseTransactionLogs(txHash, logs, contracts) {
        // for each tx log
        for (const log of logs) {
            // see if we have the contract source for the log
            const contract = contracts[log.address.toLowerCase()];
            if (contract?.ethersContract) {
                // try and parse the log topic
                try {
                    const event = contract.ethersContract.interface.parseLog(log);
                    contract.events.push(parseEvent(txHash, contract, event));
                }
                catch (err) {
                    if (!contract?.delegatedToContracts) {
                        debug(`Failed to parse log with topic ${log?.topics[0]} on contract ${log.address}`);
                        continue;
                    }
                    // try to parse the event from the delegated to contracts
                    for (const delegatedToContract of contract?.delegatedToContracts) {
                        // try and parse the log topic
                        try {
                            const event = delegatedToContract.ethersContract.interface.parseLog(log);
                            contract.events.push(parseEvent(txHash, contract, event));
                            // Found the event so no need to keep trying
                            break;
                        }
                        catch (err) {
                            debug(`Failed to parse log with topic ${log?.topics[0]} on contract ${log.address}`);
                        }
                    }
                }
            }
        }
    }
    async getContractsFromTraces(transactionsTraces, configFilename, abiFilename, network = "ethereum", mappedSource = []) {
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
            if (trace.type === tx2umlTypes_1.MessageType.DelegateCall) {
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
        // Map any addresses to different source contract
        const remappedAddresses = uniqueAddresses.map(uniqueAddress => {
            const mapping = mappedSource.find(mapSource => mapSource.contract === uniqueAddress);
            return mapping ? mapping.source : uniqueAddress;
        });
        // get contract ABIs from Etherscan
        const contracts = await this.getContractsFromAddresses(remappedAddresses);
        // Restore the mapping
        mappedSource.forEach(ms => {
            if (contracts[ms.source]) {
                contracts[ms.contract] = contracts[ms.source];
                contracts[ms.contract].address = ms.contract;
            }
        });
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
        await this.setTokenAttributes(contracts, network);
        // Override contract details like name, token symbol and ABI
        await this.configOverrides(contracts, configFilename, false);
        // Override abi information with a generic abi
        await this.fillContractsABIFromAddresses(contracts, uniqueAddresses, abiFilename);
        return contracts;
    }
    // Map contract ABI from generic abi
    async fillContractsABIFromAddresses(contracts, addresses, abiFilename) {
        const abis = await (0, config_1.loadGenericAbi)(abiFilename);
        const originalLog = console.log;
        console.log = function () { };
        for (const address of addresses) {
            if (!contracts[address].ethersContract) {
                contracts[address].ethersContract = new ethers_1.Contract(address, abis);
                contracts[address].events = [];
            }
        }
        console.log = originalLog;
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
    async setTokenAttributes(contracts, network) {
        // get the token details
        const contractAddresses = Object.keys(contracts);
        const tokensDetails = await this.ethereumNodeClient.getTokenDetails(contractAddresses);
        const labels = (0, labels_1.loadLabels)(network);
        for (const [address, contract] of Object.entries(contracts)) {
            contract.labels = labels[address]?.labels;
            const tokenDetail = tokensDetails.find(td => td.address === address);
            contract.noContract = tokenDetail?.noContract;
            contract.tokenName = tokenDetail?.tokenName || labels[address]?.name;
            contract.symbol = tokenDetail?.tokenSymbol;
            contract.decimals = tokenDetail?.decimals;
        }
    }
    async getTransferParticipants(transactionsTransfers, block, network, configFilename, mapSource = []) {
        // Get a unique list of all accounts that transfer from, transfer to or are token contracts.
        const flatTransfers = transactionsTransfers.flat();
        const addressSet = new Set();
        flatTransfers.forEach(transfer => {
            addressSet.add(transfer.from);
            addressSet.add(transfer.to);
            if (transfer.tokenAddress)
                addressSet.add(transfer.tokenAddress);
            // If an ERC1155 transfer of a token
            if (ethers_1.utils.isAddress(transfer.tokenId?.toHexString()))
                addressSet.add((0, address_1.getAddress)(transfer.tokenId.toHexString()));
        });
        const uniqueAddresses = Array.from(addressSet);
        // get token details from on-chain
        const tokenDetails = await this.ethereumNodeClient.getTokenDetails(uniqueAddresses);
        // Try and get Etherscan labels from local file
        const labels = (0, labels_1.loadLabels)(network);
        const participants = {};
        for (const token of tokenDetails) {
            const address = token.address;
            participants[token.address] = {
                ...token,
                ...labels[address.toLowerCase()],
            };
            if (!token.noContract) {
                // Check if the contract is proxied
                const implementation = await this.ethereumNodeClient.getProxyImplementation(address, block);
                // try and get contract name for the contract or its proxied implementation from Etherscan
                let sourceContract = implementation || address;
                // Remap source contract if configured
                const mappedSourceContract = mapSource.find(ms => ms.contract.toLowerCase() ===
                    sourceContract.toLowerCase());
                if (mappedSourceContract)
                    sourceContract = mappedSourceContract.source;
                const contract = await this.etherscanClient.getContract(sourceContract);
                participants[address].contractName = contract?.contractName;
            }
        }
        // Override contract details like name, token symbol and ABI
        await this.configOverrides(participants, configFilename, true);
        // Add the token symbol, name, decimal and nft flag to each transfer
        transactionsTransfers.forEach(transfers => {
            transfers.forEach(transfer => {
                if (!transfer.tokenAddress) {
                    transfer.decimals = 18;
                    return;
                }
                const tokenAddress = ethers_1.utils.isAddress(transfer.tokenId?.toHexString())
                    ? (0, address_1.getAddress)(transfer.tokenId.toHexString())
                    : transfer.tokenAddress;
                const participant = participants[tokenAddress];
                if (participant) {
                    transfer.tokenSymbol = participant.tokenSymbol;
                    transfer.tokenName = participant.tokenName;
                    transfer.decimals = participant.decimals;
                    // if an NFT, move the value to the tokenId
                    if (participant.nft) {
                        transfer.tokenId = transfer.value;
                        delete transfer.value;
                    }
                }
            });
        });
        return participants;
    }
    static parseTraceParams(traces, contracts) {
        const functionSelector2Contract = mapFunctionSelectors2Contracts(contracts);
        for (const trace of traces.flat()) {
            if (trace.inputs?.length >= 10) {
                if (trace.type === tx2umlTypes_1.MessageType.Create) {
                    trace.funcName = "constructor";
                    addConstructorParamsToTrace(trace, contracts);
                    continue;
                }
                const selectedContracts = functionSelector2Contract[trace.funcSelector];
                if (selectedContracts?.length > 0) {
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
                            const error = new Error(`Failed to parse selector ${trace.funcSelector} in trace with id ${trace.id} from ${trace.from} to ${trace.to}`, { cause: err });
                            console.warn(error);
                        }
                    }
                }
            }
        }
    }
    async configOverrides(contracts, filename, encodedAddresses = true) {
        const configs = await (0, config_1.loadConfig)(filename);
        for (const [contractAddress, config] of Object.entries(configs)) {
            const address = encodedAddresses
                ? (0, address_1.getAddress)(contractAddress)
                : contractAddress.toLowerCase();
            if (contracts[address]) {
                if (config.contractName)
                    contracts[address].contractName = config.contractName;
                if (config.tokenName)
                    contracts[address].tokenName = config.tokenName;
                if (config.tokenSymbol)
                    contracts[address].tokenSymbol = config.tokenSymbol;
                if (config.decimals)
                    contracts[address].decimals = config.decimals;
                if (config.protocolName)
                    contracts[address].protocol = config.protocolName;
                if (config?.nft)
                    contracts[address].nft = config?.nft;
                if (config.abi) {
                    contracts[address].ethersContract = new ethers_1.Contract(address, config.abi);
                    contracts[address].events = [];
                }
            }
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
        const filteredTransactionTraces = transactionTraces.map((t) => []);
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
    const removeTrace = trace.type === tx2umlTypes_1.MessageType.DelegateCall;
    const parentTrace = removeTrace
        ? // set to the last parent not removed
            lastValidParentTrace
        : // parent is not a proxy so is included
            { ...trace.parentTrace, type: tx2umlTypes_1.MessageType.Call };
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
            depth: (lastValidParentTrace?.depth || 0) + 1,
            delegatedFrom: trace.from,
            type: removeTrace ? tx2umlTypes_1.MessageType.Call : trace.type,
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
    // Do we have the ABI for the deployed contract?
    const constructor = contracts[trace.to]?.ethersContract?.interface?.deploy;
    if (!constructor?.inputs) {
        // No ABI so we don't know the constructor params which comes from verified contracts on Etherscan
        return;
    }
    // we need this flag to determine if there was no constructor params or they are unknown
    trace.parsedConstructorParams = true;
    // if we don't have the ABI then we won't have the constructorInputs but we'll double check anyway
    if (!contracts[trace.to]?.constructorInputs?.length) {
        return;
    }
    const constructorParams = abi_1.defaultAbiCoder.decode(constructor.inputs, "0x" + contracts[trace.to]?.constructorInputs);
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
const parseEvent = (txHash, contract, log) => {
    const params = [];
    try {
        // For each event param
        log.eventFragment.inputs.forEach((param, i) => {
            const components = addValuesToComponents(param, log.args[i]);
            params.push({
                name: log.eventFragment.inputs[i].name,
                type: log.eventFragment.inputs[i].type,
                value: log.args[i],
                components,
            });
        });
        return {
            name: log.name,
            txHash,
            params,
        };
    }
    catch (err) {
        throw Error(`Failed to parse event ${log.name} on the ${contract.contractName} contract at ${contract.address} with error ${err}`);
    }
};
// if function components exists, recursively add arg values to the function components
const addValuesToComponents = (paramType, args) => {
    if (paramType.baseType !== "array") {
        if (!paramType?.components) {
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
            const components = addValuesToComponents({
                ...paramType,
                type: paramType.arrayChildren?.type,
                baseType: paramType.arrayChildren?.baseType,
            }, row);
            return {
                name: r.toString(),
                type: paramType.arrayChildren?.type,
                value: row,
                components,
            };
        });
    }
};
//# sourceMappingURL=transaction.js.map