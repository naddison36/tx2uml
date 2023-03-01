"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = __importDefault(require("axios"));
const ethers_1 = require("ethers");
const regEx_1 = require("../utils/regEx");
const debug = require("debug")("tx2uml");
const etherscanBaseUrls = {
    mainnet: "https://api.etherscan.io/api",
    ropsten: "https://api-ropsten.etherscan.io/api",
    rinkeby: "https://api-rinkeby.etherscan.io/api",
    kovan: "https://api-kovan.etherscan.io/api",
    goerli: "https://api-goerli.etherscan.io/api",
    sepolia: "https://api-sepolia.etherscan.io/api",
    polygon: "https://api.polygonscan.com/api",
    bsc: "https://api.bscscan.com/api",
    arbitrum: "https://api.arbiscan.io/api",
};
class EtherscanClient {
    constructor(
    // Register your API key at https://etherscan.io/myapikey
    apiKey = "Q35WDQ2354617I8E2Z1E4WU3MIEP89DW9H", network = "mainnet") {
        this.apiKey = apiKey;
        this.network = network;
        this.url = etherscanBaseUrls[network];
    }
    async getContract(contractAddress) {
        try {
            const response = await axios_1.default.get(this.url, {
                params: {
                    module: "contract",
                    action: "getsourcecode",
                    address: contractAddress,
                    apiKey: this.apiKey,
                },
            });
            if (!Array.isArray(response?.data?.result)) {
                throw new Error(`Failed Etherscan API with result "${response?.data?.result}"`);
            }
            if (response.data.result[0].ABI ===
                "Contract source code not verified") {
                debug(`Contract ${contractAddress} is not verified on Etherscan`);
                return {
                    address: contractAddress,
                    noContract: true,
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
    // This only works with an Etherscan Pro account
    async getToken(contractAddress) {
        if (!contractAddress?.match(regEx_1.ethereumAddress)) {
            throw new TypeError(`Contract address "${contractAddress}" must be 20 bytes in hexadecimal format with a 0x prefix`);
        }
        try {
            const response = await axios_1.default.get(this.url, {
                params: {
                    module: "token",
                    action: "tokeninfo",
                    contractaddress: contractAddress,
                    apiKey: this.apiKey,
                },
            });
            if (response?.data?.status === "0") {
                throw new Error(response?.data?.result);
            }
            if (!response?.data?.result) {
                throw new Error(`no token attributes in Etherscan response: ${response?.data}`);
            }
            const attributes = response.data.result[0];
            const token = {
                address: contractAddress,
                name: attributes.name,
                symbol: attributes.symbol,
                decimals: attributes.decimals,
                totalSupply: ethers_1.BigNumber.from(attributes.totalSupply),
            };
            debug(`Got token from Etherscan for address ${contractAddress}:\n${JSON.stringify(token)}`);
            return token;
        }
        catch (err) {
            if (err?.response?.status === 404) {
                debug(`Could not find token details for contract ${contractAddress} from Etherscan`);
                return null;
            }
            throw new Error(`Failed to get token for address ${contractAddress} from Etherscan using url ${this.url}`, { cause: err });
        }
    }
}
exports.default = EtherscanClient;
//# sourceMappingURL=EtherscanClient.js.map