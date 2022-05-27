import EtherscanClient from "../EtherscanClient"

jest.setTimeout(60_000) // timeout for each test in milliseconds

const etherscanClient = new EtherscanClient()

describe("Etherscan parser", () => {
    describe("1inch", () => {
        test("get contract", async () => {
            const contract = await etherscanClient.getContract(
                "0x11111254369792b2ca5d084ab5eea397ca8fa48b"
            )
            expect(contract.contractName).toEqual("OneInchExchange")
        })
    })

    describe("get contract", () => {
        test("v0.5.16+commit.9c3226ce (ENS)", async () => {
            const contract = await etherscanClient.getContract(
                //  "0x57f1887a8BF19b14fC0dF6Fd9B2acc9Af147eA85"
                "0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e"
            )
            expect(contract.contractName).toEqual("ENSRegistryWithFallback")
        })
        test("Unverified contract", async () => {
            const contract = await etherscanClient.getContract(
                "0xF5aE0E27cf423B1Ed6513c3CA35cC14c22ee66Fd"
            )
            expect(contract.contractName).toEqual(null)
        })
        test("Invalid contract address", async () => {
            expect.assertions(2)
            try {
                await etherscanClient.getContract(
                    "0xF5aE0E27cf423B1Ed6513c3CA35cC14c22ee66F"
                )
            } catch (err) {
                expect(err).toBeInstanceOf(Error)
                expect(err.message).toContain("Invalid Address format")
            }
        })
    })
})
