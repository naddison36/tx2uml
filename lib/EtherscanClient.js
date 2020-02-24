"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = __importDefault(require("axios"));
const verror_1 = require("verror");
const debug = require('debug')('tx2uml');
const etherscanBaseUrls = {
    "mainnet": 'https://api.etherscan.io/api',
    "ropsten": 'https://api-ropsten.etherscan.io/api',
    "rinkeby": 'https://api-rinkeby.etherscan.io/api',
    "kovan": 'https://api-kovan.etherscan.io/api',
};
exports.getContract = async (contractAddress, 
// Register your API key at https://etherscan.io/myapikey
apiKey = "Q35WDQ2354617I8E2Z1E4WU3MIEP89DW9H", network = "mainnet") => {
    var _a, _b;
    try {
        const response = await axios_1.default.get(etherscanBaseUrls[network], {
            params: {
                module: 'contract',
                action: 'getsourcecode',
                address: contractAddress,
                apiKey: apiKey,
            }
        });
        if (!Array.isArray((_a = response === null || response === void 0 ? void 0 : response.data) === null || _a === void 0 ? void 0 : _a.result)) {
            throw new Error(`Failed Etherscan API with result "${(_b = response === null || response === void 0 ? void 0 : response.data) === null || _b === void 0 ? void 0 : _b.result}"`);
        }
        if (response.data.result[0].ABI === "Contract source code not verified") {
            debug(`Contract ${contractAddress} is not verified on Etherscan`);
            return {
                contractName: null
            };
        }
        debug(`Got contract name ${response.data.result[0].ContractName} for address ${contractAddress} from Etherscan`);
        return {
            contractName: response.data.result[0].ContractName
        };
    }
    catch (err) {
        throw new verror_1.VError(err, `Failed to get contract details for contract ${contractAddress} from Etherscan`);
    }
};
//# sourceMappingURL=EtherscanClient.js.map