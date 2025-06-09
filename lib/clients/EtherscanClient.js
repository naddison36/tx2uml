"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = __importDefault(require("axios"));
const ethers_1 = require("ethers");
const tx2umlTypes_1 = require("../types/tx2umlTypes");
const time_1 = require("../utils/time");
const debug = require("debug")("tx2uml");
class EtherscanClient {
    constructor(apiKey, network, url) {
        if (network === "none") {
            return;
        }
        if (network === "custom") {
            if (!url || !apiKey) {
                throw new Error("explorerUrl and etherscanKey options must be set for a custom network");
            }
            this.url = url;
            this.apiKey = apiKey;
            return;
        }
        else {
            if (!apiKey) {
                throw new Error(`The etherscanKey option must be set for a "${network}" network`);
            }
            const chainId = (0, tx2umlTypes_1.setChainId)(network);
            debug(`Chain id ${chainId} for network ${network}`);
            this.url = `https://api.etherscan.io/v2/api?chainid=${chainId}`;
            this.apiKey = apiKey;
        }
    }
    async getContract(contractAddress) {
        if (!this.url) {
            return {
                address: contractAddress,
                noContract: false,
                contractName: null,
            };
        }
        try {
            const response = await axios_1.default.get(this.url, {
                params: {
                    module: "contract",
                    action: "getsourcecode",
                    address: contractAddress,
                    apiKey: this.apiKey,
                },
            });
            // Sleep for a 1 second to avoid Etherscan rate limits
            await (0, time_1.sleep)(1000);
            if (!Array.isArray(response?.data?.result)) {
                throw new Error(`Failed Etherscan API with result "${response?.data?.result}"`);
            }
            if (response.data.result[0].ABI ===
                "Contract source code not verified") {
                debug(`Contract ${contractAddress} is not verified on Etherscan`);
                return {
                    address: contractAddress,
                    noContract: false,
                    contractName: null,
                };
            }
            debug(`Got contract name ${response.data.result[0].ContractName} for address ${contractAddress} from Etherscan`);
            const ethersContract = new ethers_1.Contract(contractAddress, response.data.result[0].ABI);
            // Parse Vyper contract name from Natspec
            let contractName = response.data.result[0].ContractName;
            if (contractName === "Vyper_contract" &&
                response.data.result[0].SourceCode) {
                const title = response.data.result[0].SourceCode.match(/\@title\s+(.+)\s+/);
                if (title?.[1]) {
                    contractName = title?.[1];
                }
            }
            return {
                address: contractAddress,
                noContract: false,
                contractName,
                ethersContract,
                constructorInputs: response.data.result[0].ConstructorArguments,
                events: [],
            };
        }
        catch (err) {
            throw new Error(`Failed to get contract details for contract ${contractAddress} from Etherscan using url ${this.url}`, { cause: err });
        }
    }
}
exports.default = EtherscanClient;
//# sourceMappingURL=EtherscanClient.js.map