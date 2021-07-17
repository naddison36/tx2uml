"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = __importDefault(require("axios"));
const ethers_1 = require("ethers");
const verror_1 = require("verror");
const regEx_1 = require("../utils/regEx");
const debug = require("debug")("tx2uml");
const etherscanBaseUrls = {
    mainnet: "https://api.etherscan.io/api",
    ropsten: "https://api-ropsten.etherscan.io/api",
    rinkeby: "https://api-rinkeby.etherscan.io/api",
    kovan: "https://api-kovan.etherscan.io/api",
    goerli: "https://api-goerli.etherscan.io/api",
    polygon: "https://api.polygonscan.com/api",
};
class EtherscanClient {
    constructor(
    // Register your API key at https://etherscan.io/myapikey
    apiKey = "Q35WDQ2354617I8E2Z1E4WU3MIEP89DW9H", network = "mainnet") {
        this.apiKey = apiKey;
        this.network = network;
        this.url = etherscanBaseUrls[this.network];
    }
    async getContract(contractAddress) {
        var _a, _b;
        try {
            const response = await axios_1.default.get(this.url, {
                params: {
                    module: "contract",
                    action: "getsourcecode",
                    address: contractAddress,
                    apiKey: this.apiKey,
                },
            });
            if (!Array.isArray((_a = response === null || response === void 0 ? void 0 : response.data) === null || _a === void 0 ? void 0 : _a.result)) {
                throw new Error(`Failed Etherscan API with result "${(_b = response === null || response === void 0 ? void 0 : response.data) === null || _b === void 0 ? void 0 : _b.result}"`);
            }
            if (response.data.result[0].ABI ===
                "Contract source code not verified") {
                debug(`Contract ${contractAddress} is not verified on Etherscan`);
                return {
                    address: contractAddress,
                    contractName: null,
                };
            }
            debug(`Got contract name ${response.data.result[0].ContractName} for address ${contractAddress} from Etherscan`);
            const ethersContract = new ethers_1.Contract(contractAddress, response.data.result[0].ABI);
            return {
                address: contractAddress,
                contractName: response.data.result[0].ContractName,
                ethersContract,
                constructorInputs: response.data.result[0].ConstructorArguments,
                events: [],
            };
        }
        catch (err) {
            throw new verror_1.VError(err, `Failed to get contract details for contract ${contractAddress} from Etherscan using url ${this.url}`);
        }
    }
    // This only works with an Etherscan Pro account
    async getToken(contractAddress) {
        var _a, _b, _c, _d;
        if (!(contractAddress === null || contractAddress === void 0 ? void 0 : contractAddress.match(regEx_1.ethereumAddress))) {
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
            if (((_a = response === null || response === void 0 ? void 0 : response.data) === null || _a === void 0 ? void 0 : _a.status) === "0") {
                throw new Error((_b = response === null || response === void 0 ? void 0 : response.data) === null || _b === void 0 ? void 0 : _b.result);
            }
            if (!((_c = response === null || response === void 0 ? void 0 : response.data) === null || _c === void 0 ? void 0 : _c.result)) {
                throw new Error(`no token attributes in Etherscan response: ${response === null || response === void 0 ? void 0 : response.data}`);
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
            if (((_d = err === null || err === void 0 ? void 0 : err.response) === null || _d === void 0 ? void 0 : _d.status) === 404) {
                debug(`Could not find token details for contract ${contractAddress} from Etherscan`);
                return null;
            }
            throw new verror_1.VError(err, `Failed to get token for address ${contractAddress} from Etherscan using url ${this.url}`);
        }
    }
}
exports.default = EtherscanClient;
//# sourceMappingURL=EtherscanClient.js.map