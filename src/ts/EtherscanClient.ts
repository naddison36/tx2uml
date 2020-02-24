import axios from "axios"
import { VError } from "verror"
import {Contract, Networks} from "./transaction"

const debug = require('debug')('tx2uml')

const etherscanBaseUrls = {
  "mainnet": 'https://api.etherscan.io/api',
  "ropsten": 'https://api-ropsten.etherscan.io/api',
  "rinkeby": 'https://api-rinkeby.etherscan.io/api',
  "kovan": 'https://api-kovan.etherscan.io/api',
}

export const getContract = async (
  contractAddress: string,
  // Register your API key at https://etherscan.io/myapikey
  apiKey: string = "Q35WDQ2354617I8E2Z1E4WU3MIEP89DW9H",
  network: Networks = "mainnet"
): Promise<Contract> => {
  try {
    const response = await axios.get(etherscanBaseUrls[network], {
      params: {
        module: 'contract',
        action: 'getsourcecode',
        address: contractAddress,
        apiKey: apiKey,
      }
    })

    if (!Array.isArray(response?.data?.result)) {
      throw new Error(`Failed Etherscan API with result "${response?.data?.result}"`)
    }

    if (response.data.result[0].ABI === "Contract source code not verified") {
      debug(`Contract ${contractAddress} is not verified on Etherscan`)
      return {
        contractName: null
      }
    }

    debug(`Got contract name ${response.data.result[0].ContractName} for address ${contractAddress} from Etherscan`)

    return {
      contractName: response.data.result[0].ContractName
    }
  } catch (err) {
    throw new VError(err, `Failed to get contract details for contract ${contractAddress} from Etherscan`)
  }
}
