import {
  getContractMessages,
  getToken,
  getTransactionDetails
} from "../AlethioClient"
import { getTransaction, MessageType } from "../transaction"

jest.setTimeout(60000) // timeout for each test in milliseconds

describe("Alethio parser", () => {
  describe("1inch", () => {
    test("get transaction contract call", async () => {
      const [messages, contracts, details] = await getTransaction(
        "0x34e4f8b86b5c3fe5a9e30e7cf75b242ed3e6e4eeea68cfaf3ca68ef1edb93ed1"
      )
      expect(details.status).toEqual(true)
      expect(
        contracts["0x11111254369792b2ca5d084ab5eea397ca8fa48b"].contractName
      ).toEqual("OneInchExchange")
      expect(messages).toHaveLength(95)
      expect(messages[0].gasLimit).toEqual(BigInt(996456))
    }, 100000)
    test("get success transaction", async () => {
      const [tx, firstMessage] = await getTransactionDetails(
        "0xbc979bfcd136884dc6c0d7243696f3443d6c9f9cc478c3189cb021968e3e31b2"
      )
      expect(tx.nonce).toEqual(49826)
      expect(tx.status).toEqual(true)
      expect(tx.index).toEqual(54)
      expect(tx.value).toEqual(BigInt(0))
      expect(tx.gasPrice).toEqual(BigInt(30000000000))
      expect(firstMessage.gasUsed).toEqual(BigInt(214283))
      expect(firstMessage.gasLimit).toEqual(BigInt(509859))
    })
    test("get messages", async () => {
      const messages = await getContractMessages(
        "0xbc979bfcd136884dc6c0d7243696f3443d6c9f9cc478c3189cb021968e3e31b2"
      )
      expect(messages).toHaveLength(29)
      expect(messages[0].value).toEqual(BigInt(0))
      expect(messages[0].gasLimit).toEqual(BigInt(466557))
      expect(messages[0].gasUsed).toEqual(BigInt(114411))
      expect(messages[7].type).toEqual(MessageType.Delegatecall)
      expect(messages[8].delegatedCall?.id).toEqual(0)
      expect(messages[8].delegatedCall?.last).toBeFalsy()
      expect(messages[9].delegatedCall?.id).toEqual(1)
      expect(messages[10].delegatedCall?.id).toEqual(2)
      expect(messages[10].delegatedCall?.last).toBeTruthy()
      // FIXME seems like an Alethio bug
      expect(messages[9].type).toEqual(MessageType.Value)
    })
  })

  describe("get transaction details from Alethio", () => {
    test("get failed transaction", async () => {
      const [tx, firstMessage] = await getTransactionDetails(
        "0x7699bdafead1714980503ef14806d9846153b01145c793176439c2a9c91a6237"
      )
      expect(tx.nonce).toEqual(2549)
      expect(tx.status).toEqual(false)
      expect(tx.error).toEqual("Bad instruction")
      expect(tx.index).toEqual(81)
      expect(tx.value).toEqual(BigInt(0))
      expect(tx.gasPrice).toEqual(BigInt(5000000000))
      expect(firstMessage.gasUsed).toEqual(BigInt(60000))
      expect(firstMessage.gasLimit).toEqual(BigInt(60000))
    })
  })

  describe("get token details", () => {
    test("Tether USD", async () => {
      const token = await getToken("0xdac17f958d2ee523a2206206994597c13d831ec7")
      expect(token.address).toEqual(
        "0xdac17f958d2ee523a2206206994597c13d831ec7"
      )
      expect(token.symbol).toEqual("USDT")
      expect(token.name).toEqual("Tether USD")
      expect(token.decimals).toEqual(6)
    })
    test("Failed as ENS contract", async () => {
      const token = await getToken("0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e")
      expect(token).toEqual(null)
    })
  })
})
