import {
    BigNumber,
    BigNumberish,
    constants,
    Contract,
    providers,
    Signer,
} from "ethers"
import { JsonRpcProvider } from "@ethersproject/providers"

import { TokenInfoABI } from "./ABIs"
import {
    Network,
    TokenDetails,
    Trace,
    TransactionDetails,
    Transfer,
    TransferType,
} from "../types/tx2umlTypes"
import { transactionHash } from "../utils/regEx"
import { TokenInfo } from "../types/TokenInfo"
import { Log } from "@ethersproject/abstract-provider"
import { getAddress, hexDataSlice, parseEther } from "ethers/lib/utils"

require("axios-debug-log")
const debug = require("debug")("tx2uml")

const tokenInfoAddresses: { [network: string]: string } = {
    mainnet: "0x05b4671B2cC4858A7E72c2B24e202a87520cf14e",
    polygon: "0x92aFa83874AA86c7f71F293F8A097ca7fE0ff003",
    optimistic: "0x149a692a94eEe18e7854CEA1CEaab557618D4D46",
    goerli: "0x8E2587265C68CD9EE3EcBf22DC229980b47CB960",
    sepolia: "0x8E2587265C68CD9EE3EcBf22DC229980b47CB960",
    arbitrum: "0x43B3BCe874EC872EFbCC784c1e3CD03005E529a9",
}
const ProxySlot =
    "0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc"

export default abstract class EthereumNodeClient {
    public readonly ethersProvider: JsonRpcProvider
    private tokenInfoAddress: string

    constructor(
        public readonly url: string = "http://localhost:8545",
        public readonly network: Network
    ) {
        this.ethersProvider = new providers.JsonRpcProvider(url)
        if (!tokenInfoAddresses[network])
            throw Error(
                `Can not get token info from ${network} as TokenInfo contract has not been deployed`
            )
        this.tokenInfoAddress = tokenInfoAddresses[network]
    }

    abstract getTransactionTrace(txHash: string): Promise<Trace[]>
    abstract getTransactionError(tx: TransactionDetails): Promise<string>

    async getTransactionDetails(txHash: string): Promise<TransactionDetails> {
        if (!txHash?.match(transactionHash)) {
            throw new TypeError(
                `Transaction hash "${txHash}" must be 32 bytes in hexadecimal format with a 0x prefix`
            )
        }

        try {
            debug(
                `About to get tx details and receipt from chain for ${txHash}`
            )
            // get the transaction and receipt concurrently
            const txPromise = this.ethersProvider.getTransaction(txHash)
            const receiptPromise =
                this.ethersProvider.getTransactionReceipt(txHash)
            const [tx, receipt] = await Promise.all([txPromise, receiptPromise])

            if (!receipt)
                throw Error(
                    `Failed to get transaction details and receipt for ${txHash} from ${this.url}`
                )

            debug(`Got tx details and receipt for ${txHash}`)

            const block = await this.ethersProvider.getBlock(
                receipt.blockNumber
            )
            const txDetails: TransactionDetails = {
                hash: tx.hash,
                from: tx.from,
                to: tx.to,
                data: tx.data,
                nonce: tx.nonce,
                index: receipt.transactionIndex,
                value: tx.value,
                gasLimit: tx.gasLimit,
                gasPrice: tx.gasPrice,
                maxPriorityFeePerGas: tx.maxPriorityFeePerGas,
                maxFeePerGas: tx.maxFeePerGas,
                gasUsed: receipt.gasUsed,
                timestamp: new Date(block.timestamp * 1000),
                status: receipt.status === 1,
                logs: receipt.logs,
                blockNumber: receipt.blockNumber,
            }
            // If the transaction failed, get the revert reason
            if (receipt.status === 0) {
                txDetails.error = await this.getTransactionError(txDetails)
            }

            return txDetails
        } catch (err) {
            throw new Error(
                `Failed to get transaction details for tx hash ${txHash} from url ${this.url}.`,
                { cause: err }
            )
        }
    }

    async getTokenDetails(
        contractAddresses: string[]
    ): Promise<TokenDetails[]> {
        const tokenInfo = new Contract(
            this.tokenInfoAddress,
            TokenInfoABI,
            this.ethersProvider
        ) as TokenInfo
        try {
            // Break up the calls into 10 contracts at a time
            let tokenDetails: TokenDetails[] = []
            const chunkSize = 10
            for (let i = 0; i < contractAddresses.length; i += chunkSize) {
                const cunkedAddresses = contractAddresses.slice(
                    i,
                    i + chunkSize
                )
                const results = await tokenInfo.getInfoBatch(cunkedAddresses)
                const mappedResponse: TokenDetails[] = results.map(
                    (result, r) => ({
                        address: contractAddresses[i + r],
                        noContract: result.noContract,
                        nft: result.nft,
                        tokenSymbol: result.symbol,
                        tokenName: result.name,
                        decimals: result.decimals.toNumber(),
                    })
                )
                tokenDetails = tokenDetails.concat(mappedResponse)
            }
            debug(`Got token information for ${tokenDetails.length} contracts`)
            return tokenDetails
        } catch (err) {
            console.error(
                `Failed to get token information for contracts: ${contractAddresses}.\nerror: ${err.message}`
            )
            return []
        }
    }

    // Parse Transfer events from a transaction receipt
    static parseTransferEvents(logs: Array<Log>): Transfer[] {
        const transferEvents: Transfer[] = []
        logs.forEach((log, i) => {
            const tokenAddress = getAddress(log.address)
            const baseTransfer = {
                tokenAddress,
                pc: 0,
            }
            try {
                // If Transfer(address,address,uint256)
                if (
                    "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef" ===
                    log.topics[0]
                ) {
                    const fromAddress = parseAddress(log, 1)
                    const toAddress = parseAddress(log, 2)
                    transferEvents.push({
                        ...baseTransfer,
                        from:
                            fromAddress === constants.AddressZero
                                ? getAddress(log.address)
                                : fromAddress,
                        to:
                            toAddress === constants.AddressZero
                                ? getAddress(log.address)
                                : toAddress,
                        value: parseValue(log, 3),
                        event: "Transfer",
                        type:
                            fromAddress === constants.AddressZero
                                ? TransferType.Mint
                                : toAddress === constants.AddressZero
                                ? TransferType.Burn
                                : TransferType.Transfer,
                    })
                }
                // If Deposit(address,uint256)
                else if (
                    "0xe1fffcc4923d04b559f4d29a8bfc6cda04eb5b0d3c460751c2402c5c5cc9109c" ===
                    log.topics[0]
                ) {
                    if (log.topics.length === 2) {
                        transferEvents.push({
                            ...baseTransfer,
                            from: tokenAddress,
                            to: parseAddress(log, 1),
                            value: parseValue(log, 2),
                            event: "Deposit",
                            type: TransferType.Mint,
                        })
                    }
                }
                // If Withdraw(address,uint256)
                else if (
                    "0x7fcf532c15f0a6db0bd6d0e038bea71d30d808c7d98cb3bf7268a95bf5081b65" ===
                    log.topics[0]
                ) {
                    if (log.topics.length === 2) {
                        transferEvents.push({
                            ...baseTransfer,
                            from: parseAddress(log, 1),
                            to: tokenAddress,
                            value: parseValue(log, 2),
                            event: "Withdraw",
                            type: TransferType.Burn,
                        })
                    }
                }
            } catch (err) {
                throw new Error(`Failed to parse the event log ${i}`, {
                    cause: err,
                })
            }
        })

        return transferEvents
    }

    public getProxyImplementation = async (address: string, block: number) => {
        try {
            const slotValue = await this.ethersProvider.getStorageAt(
                address,
                ProxySlot,
                block
            )

            if (slotValue !== constants.HashZero) {
                const proxyImplementation = getAddress(
                    "0x" + slotValue.slice(-40)
                )
                debug(
                    `Contract ${address} has proxy implementation ${proxyImplementation}`
                )
                return proxyImplementation
            }
            return undefined
        } catch (err) {
            throw Error(
                `Failed to get proxy implementation for contract ${address}`,
                { cause: err }
            )
        }
    }

    public async impersonate(address: string, fund = true): Promise<Signer> {
        await this.ethersProvider.send("hardhat_impersonateAccount", [address])
        if (fund) {
            // Give the account 10 Ether
            await this.setBalance(address, parseEther("10"))
        }
        return this.ethersProvider.getSigner(address)
    }

    public async setBalance(address: string, balance: BigNumberish) {
        await this.ethersProvider.send("hardhat_setBalance", [
            address,
            BigNumber.from(balance).toHexString(),
        ])
    }
}

const parseAddress = (log: Log, paramPosition: number): string => {
    const topicLength = log.topics.length
    if (paramPosition < topicLength) {
        // If the address is in the topic
        const lowercaseAddress = hexDataSlice(log.topics[paramPosition], 12)
        return getAddress(lowercaseAddress)
    } else {
        // if the address is in the data
        const offset = (paramPosition - topicLength) * 32 + 12
        const endOffset = (paramPosition - topicLength + 1) * 32
        const lowercaseAddress = hexDataSlice(log.data, offset, endOffset)
        // Convert address to checksum format
        return getAddress(lowercaseAddress)
    }
}

const parseValue = (log: Log, paramPosition: number): BigNumber => {
    const topicLength = log.topics.length
    if (paramPosition < topicLength) {
        // If the value is in the topic
        return BigNumber.from(log.topics[paramPosition])
    } else {
        // if the value is in the data
        const offset = (paramPosition - topicLength) * 32
        const endOffset = (paramPosition - topicLength + 1) * 32
        const hexValue = hexDataSlice(log.data, offset, endOffset)
        return BigNumber.from(hexValue)
    }
}
