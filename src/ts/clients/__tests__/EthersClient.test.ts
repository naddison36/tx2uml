import { Logger } from "ethers/lib/utils"

import { EthersMatchers } from "../../utils/jest"
import EthereumNodeClient from "../EthereumNodeClient"

jest.setTimeout(60000) // timeout for each test in milliseconds
// Extend the Jest matchers with Ethers BigNumber matchers like toEqualBN
expect.extend(EthersMatchers)

Logger.setLogLevel(Logger.levels.DEBUG)

const dai = "0x6b175474e89094c44da98b954eedeac495271d0f"
const uniswap = "0x1f9840a85d5af5bf1d1762f925bdaddc4201f984"
const maker = "0x9f8f72aa9304c8b593d555f12ef6589cc3a579a2"
const usdcProxy = "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48"
const usdcImpl = "0xb7277a6e95992041568d9391d09d0122023778a2"
const mStableUSDProxy = "0xe2f2a5C287993345a840Db3B0845fbC70f5935a5"
const mStableUSDImpl = "0xE0d0D052d5B1082E52C6b8422Acd23415c3DF1c4"
const externallyOwnerAccount = "0xbbabad191e7802f526c289c15909a8cba2a5ff2a"

describe("Ethers.js and multicall client", () => {
    const nodeClient = new EthereumNodeClient(process.env.ARCHIVE_NODE_URL)
    describe("Get transaction details", () => {
        test("delegate call", async () => {
            const tx = await nodeClient.getTransactionDetails(
                "0xe5e35ee13bb6326df4da89f17504a81923299d4986de06a019ca7856cbe76bca"
            )
            expect(tx.from).toEqual(
                "0x7A39608107DC014d4bBd7A5F01d3FbA5Dff6D042"
            )
            expect(tx.to).toEqual("0x2C4Bd064b998838076fa341A83d007FC2FA50957")
            expect(tx.nonce).toEqual(224)
            expect(tx.timestamp).toEqual(new Date("24-Feb-2020 21:30:47 UTC"))
            expect(tx.gasLimit).toEqualBN(83173)
            expect(tx.gasPrice).toEqualBN(1000000000)
            expect(tx.gasUsed).toEqualBN(59813)
            expect(tx.status).toBeTruthy()
        })
        test("Failed Uniswap v2", async () => {
            const tx = await nodeClient.getTransactionDetails(
                "0x925109efeb515b8b785cdd5fc74fbbbfa69a46a46d4dcfe0b0407715b2182bfe"
            )
            expect(tx.from).toEqual(
                "0xAA6ebF8aEa80261E5e45205635bc1ca3553B1098"
            )
            expect(tx.to).toEqual("0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D")
            expect(tx.nonce).toEqual(142)
            expect(tx.timestamp).toEqual(new Date("29-Dec-2020 23:02:16 UTC"))
            expect(tx.gasLimit).toEqualBN(155268)
            expect(tx.gasPrice).toEqualBN(58000000000)
            expect(tx.gasUsed).toEqualBN(28889)
            expect(tx.status).toBeFalsy()
        })
        test("Failed internal 1inch", async () => {
            const tx = await nodeClient.getTransactionDetails(
                "0x5127c14ab29ad659b1f1063fcf022d990cf00970dae8160693ccc8b9561d4b4d"
            )
            expect(tx.status).toBeTruthy()
        })
    })
    describe("Get token details", () => {
        test("Get Maker with bytes32 function outputs", async () => {
            const tokenDetail = await nodeClient.getTokenDetailsUnknownABI(
                maker
            )
            expect(tokenDetail.symbol).toEqual("MKR")
            expect(tokenDetail.name).toEqual("Maker")
        })
        test("Get Uniswap string function outputs", async () => {
            const tokenDetail = await nodeClient.getTokenDetailsUnknownABI(
                uniswap
            )
            expect(tokenDetail.symbol).toEqual("UNI")
            expect(tokenDetail.name).toEqual("Uniswap")
        })
        test("Get USDC from proxy", async () => {
            const tokenDetail = await nodeClient.getTokenDetailsUnknownABI(
                usdcProxy
            )
            expect(tokenDetail.symbol).toEqual("USDC")
            expect(tokenDetail.name).toEqual("USD Coin")
        })
        test("USDC implementation", async () => {
            const tokenDetails = await nodeClient.getTokenDetailsUnknownABI(
                usdcImpl
            )
            expect(tokenDetails.symbol).toBeUndefined()
            expect(tokenDetails.name).toBeUndefined()
        })
        test("mStableUSD proxy", async () => {
            const tokenDetail = await nodeClient.getTokenDetailsUnknownABI(
                mStableUSDProxy
            )
            expect(tokenDetail.symbol).toEqual("mUSD")
            expect(tokenDetail.name).toEqual("mStable USD")
        })
        test("mStableUSD implementation", async () => {
            const tokenDetail = await nodeClient.getTokenDetailsUnknownABI(
                mStableUSDImpl
            )
            expect(tokenDetail.symbol).toBeUndefined()
            expect(tokenDetail.name).toBeUndefined()
        })
        test("Get tokens with string and bytes32 outputs", async () => {
            const tokenDetail = await nodeClient.getTokenDetailsUnknownABI(dai)
            expect(tokenDetail.symbol).toEqual("DAI")
            expect(tokenDetail.name).toEqual("Dai Stablecoin")
        })
        test("externally owned account with string token ABI", async () => {
            const tokenDetail = await nodeClient.getTokenDetailsUnknownABI(
                externallyOwnerAccount
            )
            expect(tokenDetail.symbol).toBeUndefined()
            expect(tokenDetail.name).toBeUndefined()
        })
    })
})
