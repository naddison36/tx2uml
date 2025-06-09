import EtherscanClient from "../EtherscanClient"

jest.setTimeout(60000) // timeout for each test in milliseconds

const etherscanClient = new EtherscanClient(
    process.env.EXPLORER_API_KEY,
    "ethereum"
)

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
        test("Vyper (ENS)", async () => {
            const contract = await etherscanClient.getContract(
                "0xfac7bea255a6990f749363002136af6556b31e04"
            )
            expect(contract.contractName).toEqual("BaseRegistrarImplementation")
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
                expect(err.message).toContain(
                    "Failed to get contract details for contract"
                )
            }
        })
    })
})
