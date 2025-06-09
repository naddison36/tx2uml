import axios from "axios"
import { Contract as EthersContract } from "ethers"

import { Contract, setChainId } from "../types/tx2umlTypes"
import { sleep } from "../utils/time"

const debug = require("debug")("tx2uml")

export default class EtherscanClient {
    public readonly apiKey?: string
    public readonly url: string

    constructor(apiKey: string, network?: string, url?: string) {
        if (network === "none") {
            return
        }
        if (network === "custom") {
            if (!url || !apiKey) {
                throw new Error(
                    "explorerUrl and etherscanKey options must be set for a custom network"
                )
            }
            this.url = url
            this.apiKey = apiKey
            return
        } else {
            if (!apiKey) {
                throw new Error(
                    `The etherscanKey option must be set for a "${network}" network`
                )
            }
            const chainId = setChainId(network)
            debug(`Chain id ${chainId} for network ${network}`)
            this.url = `https://api.etherscan.io/v2/api?chainid=${chainId}`
            this.apiKey = apiKey
        }
    }

    async getContract(contractAddress: string): Promise<Contract> {
        if (!this.url) {
            return {
                address: contractAddress,
                noContract: false,
                contractName: null,
            }
        }
        try {
            const response = await axios.get(this.url, {
                params: {
                    module: "contract",
                    action: "getsourcecode",
                    address: contractAddress,
                    apiKey: this.apiKey,
                },
            })

            // Sleep for a 1 second to avoid Etherscan rate limits
            await sleep(1000)

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
}
