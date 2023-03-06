import axios from "axios"
import { BigNumber, Contract as EthersContract } from "ethers"

import { Contract, Network, networks, Token } from "../types/tx2umlTypes"
import { ethereumAddress } from "../utils/regEx"

const debug = require("debug")("tx2uml")

export default class EtherscanClient {
    public readonly url: string

    constructor(
        // Register your API key at https://etherscan.io/myapiKey
        public readonly apiKey: string = "Q35WDQ2354617I8E2Z1E4WU3MIEP89DW9H",
        public readonly network: Network = "mainnet"
    ) {
        if (!networks.includes(network)) {
            throw new Error(
                `Invalid network "${network}". Must be one of ${networks}`
            )
        } else if (network === "mainnet") {
            this.url = "https://api.etherscan.io/api"
        } else if (network === "polygon") {
            this.url = "https://api.polygonscan.com/api"
            this.apiKey = "AMHGNTV5A7XYGX2M781JB3RC1DZFVRWQEB"
        } else if (network === "testnet.polygon") {
            this.url = "https://api-testnet.polygonscan.com/api"
            this.apiKey = "AMHGNTV5A7XYGX2M781JB3RC1DZFVRWQEB"
        } else if (network === "arbitrum") {
            this.url = "https://api.arbiscan.io/api"
            this.apiKey = "ZGTK2TAGWMAB6IAC12BMK8YYPNCPIM8VDQ"
        } else if (network === "testnet.arbitrum") {
            this.url = "https://api-testnet.arbiscan.io/api"
            this.apiKey = "ZGTK2TAGWMAB6IAC12BMK8YYPNCPIM8VDQ"
        } else if (network === "avalanche") {
            this.url = "https://api.snowtrace.io/api"
            this.apiKey = "U5FAN98S5XNH5VI83TI4H35R9I4TDCKEJY"
        } else if (network === "testnet.avalanche") {
            this.url = "https://api-testnet.snowtrace.io/api"
            this.apiKey = "U5FAN98S5XNH5VI83TI4H35R9I4TDCKEJY"
        } else if (network === "bsc") {
            this.url = "https://api.bscscan.com/api"
            this.apiKey = "APYH49FXVY9UA3KTDI6F4WP3KPIC86NITN"
        } else if (network === "testnet.bsc") {
            this.url = "https://api-testnet.bscscan.com/api"
            this.apiKey = "APYH49FXVY9UA3KTDI6F4WP3KPIC86NITN"
        } else if (network === "crono") {
            this.url = "https://api.cronoscan.com/api"
            this.apiKey = "76A3RG5WHTPMMR66E9SFI2EIDT6MP976W2"
        } else if (network === "fantom") {
            this.url = "https://api.ftmscan.com/api"
            this.apiKey = "71KRX13XPZMGR3D1Q85W78G2DSZ4JPMAEX"
        } else if (network === "testnet.fantom") {
            this.url = "https://api-testnet.ftmscan.com/api"
            this.apiKey = "71KRX13XPZMGR3D1Q85W78G2DSZ4JPMAEX"
        } else if (network === "optimistic" || network === "kovan-optimistic") {
            this.url = `https://api-${network}.etherscan.io/api`
            this.apiKey = "FEXS1HXVA4Y2RNTMEA8V1UTK21S4JWHH9U"
        } else if (network === "moonbeam") {
            this.url = "https://api-moonbeam.moonscan.io/api"
            this.apiKey = "5EUFXW6TDC16VERF3D9SCWRRU6AEMTBHNJ"
        } else if (network === "gnosisscan") {
            this.url = "https://api.gnosisscan.io/api"
            this.apiKey = "2RWGXIWK538EJ8XSP9DE2JUINSCG7UCSJB"
        } else {
            this.url = `https://api-${network}.etherscan.io/api`
        }
    }

    async getContract(contractAddress: string): Promise<Contract> {
        try {
            const response = await axios.get(this.url, {
                params: {
                    module: "contract",
                    action: "getsourcecode",
                    address: contractAddress,
                    apiKey: this.apiKey,
                },
            })

            if (!Array.isArray(response?.data?.result)) {
                throw new Error(
                    `Failed Etherscan API with result "${response?.data?.result}"`
                )
            }

            if (
                response.data.result[0].ABI ===
                "Contract source code not verified"
            ) {
                debug(
                    `Contract ${contractAddress} is not verified on Etherscan`
                )
                return {
                    address: contractAddress,
                    noContract: false,
                    contractName: null,
                }
            }

            debug(
                `Got contract name ${response.data.result[0].ContractName} for address ${contractAddress} from Etherscan`
            )

            const ethersContract = new EthersContract(
                contractAddress,
                response.data.result[0].ABI
            )
            // Parse Vyper contract name from Natspec
            let contractName = response.data.result[0].ContractName
            if (
                contractName === "Vyper_contract" &&
                response.data.result[0].SourceCode
            ) {
                const title =
                    response.data.result[0].SourceCode.match(
                        /\@title\s+(.+)\s+/
                    )
                if (title?.[1]) {
                    contractName = title?.[1]
                }
            }
            return {
                address: contractAddress,
                noContract: false,
                contractName,
                ethersContract,
                constructorInputs: response.data.result[0].ConstructorArguments,
                events: [],
            }
        } catch (err) {
            throw new Error(
                `Failed to get contract details for contract ${contractAddress} from Etherscan using url ${this.url}`,
                { cause: err }
            )
        }
    }

    // This only works with an Etherscan Pro account
    async getToken(contractAddress: string): Promise<Token | null> {
        if (!contractAddress?.match(ethereumAddress)) {
            throw new TypeError(
                `Contract address "${contractAddress}" must be 20 bytes in hexadecimal format with a 0x prefix`
            )
        }

        try {
            const response = await axios.get(this.url, {
                params: {
                    module: "token",
                    action: "tokeninfo",
                    contractaddress: contractAddress,
                    apiKey: this.apiKey,
                },
            })
            if (response?.data?.status === "0") {
                throw new Error(response?.data?.result)
            }
            if (!response?.data?.result) {
                throw new Error(
                    `no token attributes in Etherscan response: ${response?.data}`
                )
            }

            const attributes = response.data.result[0]

            const token: Token = {
                address: contractAddress,
                name: attributes.name,
                symbol: attributes.symbol,
                decimals: attributes.decimals,
                totalSupply: BigNumber.from(attributes.totalSupply),
            }

            debug(
                `Got token from Etherscan for address ${contractAddress}:\n${JSON.stringify(
                    token
                )}`
            )

            return token
        } catch (err) {
            if (err?.response?.status === 404) {
                debug(
                    `Could not find token details for contract ${contractAddress} from Etherscan`
                )
                return null
            }
            throw new Error(
                `Failed to get token for address ${contractAddress} from Etherscan using url ${this.url}`,
                { cause: err }
            )
        }
    }
}
