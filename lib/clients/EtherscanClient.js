"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = __importDefault(require("axios"));
const ethers_1 = require("ethers");
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
        else if (network === "mainnet") {
            this.url = "https://api.etherscan.io/api";
            // Register your API key at https://etherscan.io/myapiKey
            this.apiKey = apiKey || "S53TDPWT9CJ4MRMCTG1CZQ16RSYDQZJXPF";
        }
        else if (network === "polygon") {
            this.url = "https://api.polygonscan.com/api";
            this.apiKey = apiKey || "AMHGNTV5A7XYGX2M781JB3RC1DZFVRWQEB";
        }
        else if (network === "arbitrum") {
            this.url = "https://api.arbiscan.io/api";
            this.apiKey = apiKey || "ZGTK2TAGWMAB6IAC12BMK8YYPNCPIM8VDQ";
        }
        else if (network === "avalanche") {
            this.url = "https://api.snowtrace.io/api";
            this.apiKey = apiKey || "U5FAN98S5XNH5VI83TI4H35R9I4TDCKEJY";
        }
        else if (network === "bsc") {
            this.url = "https://api.bscscan.com/api";
            this.apiKey = apiKey || "APYH49FXVY9UA3KTDI6F4WP3KPIC86NITN";
        }
        else if (network === "crono") {
            this.url = "https://api.cronoscan.com/api";
            this.apiKey = apiKey || "76A3RG5WHTPMMR66E9SFI2EIDT6MP976W2";
        }
        else if (network === "fantom") {
            this.url = "https://api.ftmscan.com/api";
            this.apiKey = apiKey || "71KRX13XPZMGR3D1Q85W78G2DSZ4JPMAEX";
        }
        else if (network === "optimisim") {
            this.url = "https://api-optimistic.etherscan.io/api";
            this.apiKey = apiKey || "FEXS1HXVA4Y2RNTMEA8V1UTK21S4JWHH9U";
        }
        else if (network === "moonbeam") {
            this.url = "https://api-moonbeam.moonscan.io/api";
            this.apiKey = apiKey || "5EUFXW6TDC16VERF3D9SCWRRU6AEMTBHNJ";
        }
        else if (network === "gnosis") {
            this.url = "https://api.gnosisscan.io/api";
            this.apiKey = apiKey || "2RWGXIWK538EJ8XSP9DE2JUINSCG7UCSJB";
        }
        else if (network === "scroll") {
            this.url = "https://api.scrollscan.com/api";
            this.apiKey = "7B1PCABN8RFVYU5VNSI7CMC48MK9UMZI44";
        }
        else if (network === "celo") {
            this.url = "https://api.celoscan.io/api";
            this.apiKey = apiKey || "JBV78T5KP15W7WKKKD6KC4J8RX2F4PK8AF";
        }
        else if (network === "base") {
            this.url = "https://api.basescan.org/api";
            this.apiKey = apiKey || "9I5HUJHPD4ZNXJ4M8TZJ1HD2QBVP1U3M3J";
        }
        else if (network === "sonic") {
            this.url = "https://api.sonicscan.org/api";
            this.apiKey = apiKey || "STCM7CPYP341C66C4IVV1IFMWDYRUTI1QY";
        }
        else {
            if (!apiKey) {
                throw new Error(`The etherscanKey option must be set for a "${network}" network`);
            }
            this.url = `https://api-${network}.etherscan.io/api`;
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