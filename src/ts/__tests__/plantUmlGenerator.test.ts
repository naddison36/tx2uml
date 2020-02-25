import { genMessages, genParticipants } from "../plantUmlGenerator"
import { Contracts, Message, MessageType, Payload } from "../transaction"

const baseMessage: Message = {
  id: 0,
  type: MessageType.Call,
  from: "0x00007F958D2ee523a2206206994597C13D831111",
  to: "0x11116FECD516Ecc3849DAf6845e3EC8680872222",
  value: BigInt(0),
  gasUsed: BigInt(1),
  gasLimit: BigInt(2),
  callDepth: 0,
  status: true,
  error: undefined
}

const basePayload: Payload = {
  funcName: "someFunc",
  funcSelector: "0a5ea466",
  inputs: [],
  outputs: []
}

const testContracts: Contracts = {
  "0x0000324fd7df8b2a969969bcc3663d74f0581111": {
    address: "0x0000324fd7df8b2a969969bcc3663d74f0581111"
  },
  "0x11116FECD516Ecc3849DAf6845e3EC8680872222": {
    address: "0x11116FECD516Ecc3849DAf6845e3EC8680872222",
    contractName: "KyberNetworkProxy"
  },
  "0x22226FECD516Ecc3849DAf6845e3EC8680873333": {
    address: "0x22226FECD516Ecc3849DAf6845e3EC8680873333",
    contractName: "KyberNetwork"
  },
  "0x333365fe5446d880f8ec261d9224166909124444": {
    address: "0x333365fe5446d880f8ec261d9224166909124444",
    contractName: "Tether USD"
  }
}

describe("Plant UML generator", () => {
  test("List participants", () => {
    const plantUml = genParticipants(testContracts)
    console.log(plantUml)
    expect(plantUml).toEqual(
      "\n" +
        'participant "0x0000..1111" as 00001111\n' +
        'participant "0x1111..2222" as 11112222 <<KyberNetworkProxy>>\n' +
        'participant "0x2222..3333" as 22223333 <<KyberNetwork>>\n' +
        'participant "0x3333..4444" as 33334444 <<Tether USD>>\n'
    )
  })

  describe("Messages", () => {
    test("0->1", () => {
      const messages: Message[] = [
        {
          ...baseMessage,
          from: "0x0000324fd7df8b2a969969bcc3663d74f0581111",
          to: "0x11116FECD516Ecc3849DAf6845e3EC8680872222",
          payload: {
            ...basePayload,
            funcName: "first"
          }
        }
      ]
      const plantUml = genMessages(messages)
      console.log(plantUml)
      expect(plantUml).toEqual(
        "\n00001111 -> 11112222: first\n" + "activate 11112222\n" + "return\n"
      )
    })
    test("0->1->2", () => {
      const messages: Message[] = [
        {
          ...baseMessage,
          from: "0x0000324fd7df8b2a969969bcc3663d74f0581111",
          to: "0x11116FECD516Ecc3849DAf6845e3EC8680872222",
          callDepth: 0,
          payload: {
            ...basePayload,
            funcName: "first"
          }
        },
        {
          ...baseMessage,
          from: "0x11116FECD516Ecc3849DAf6845e3EC8680872222",
          to: "0x22226FECD516Ecc3849DAf6845e3EC8680873333",
          callDepth: 1,
          id: 1,
          payload: {
            ...basePayload,
            funcName: "second"
          }
        }
      ]
      const plantUml = genMessages(messages)
      console.log(plantUml)
      expect(plantUml).toEqual(
        "\n00001111 -> 11112222: first\n" +
          "activate 11112222\n" +
          "11112222 -> 22223333: second\n" +
          "activate 22223333\n" +
          "return\n" +
          "return\n"
      )
    })
    test("0->1 0->1", () => {
      const messages: Message[] = [
        {
          ...baseMessage,
          from: "0x0000324fd7df8b2a969969bcc3663d74f0581111",
          to: "0x11116FECD516Ecc3849DAf6845e3EC8680872222",
          callDepth: 0,
          payload: {
            ...basePayload,
            funcName: "first"
          }
        },
        {
          ...baseMessage,
          from: "0x0000324fd7df8b2a969969bcc3663d74f0581111",
          to: "0x11116FECD516Ecc3849DAf6845e3EC8680872222",
          callDepth: 0,
          id: 1,
          payload: {
            ...basePayload,
            funcName: "second"
          }
        }
      ]
      const plantUml = genMessages(messages)
      console.log(plantUml)
      expect(plantUml).toEqual(
        "\n00001111 -> 11112222: first\n" +
          "activate 11112222\n" +
          "return\n" +
          "00001111 -> 11112222: second\n" +
          "activate 11112222\n" +
          "return\n"
      )
    })
    test("0->1->2 0->2", () => {
      const messages: Message[] = [
        {
          ...baseMessage,
          from: "0x0000324fd7df8b2a969969bcc3663d74f0581111",
          to: "0x11116FECD516Ecc3849DAf6845e3EC8680872222",
          callDepth: 0,
          payload: {
            ...basePayload,
            funcName: "first"
          }
        },
        {
          ...baseMessage,
          from: "0x11116FECD516Ecc3849DAf6845e3EC8680872222",
          to: "0x22226FECD516Ecc3849DAf6845e3EC8680873333",
          callDepth: 1,
          id: 1,
          payload: {
            ...basePayload,
            funcName: "second"
          }
        },
        {
          ...baseMessage,
          from: "0x0000324fd7df8b2a969969bcc3663d74f0581111",
          to: "0x22226FECD516Ecc3849DAf6845e3EC8680873333",
          callDepth: 0,
          id: 2,
          payload: {
            ...basePayload,
            funcName: "third"
          }
        }
      ]
      const plantUml = genMessages(messages)
      console.log(plantUml)
      expect(plantUml).toEqual(
        "\n00001111 -> 11112222: first\n" +
          "activate 11112222\n" +
          "11112222 -> 22223333: second\n" +
          "activate 22223333\n" +
          "return\n" +
          "return\n" +
          "00001111 -> 22223333: third\n" +
          "activate 22223333\n" +
          "return\n"
      )
    })
    test("0->1->2 1->3", () => {
      const messages: Message[] = [
        {
          ...baseMessage,
          from: "0x0000324fd7df8b2a969969bcc3663d74f0581111",
          to: "0x11116FECD516Ecc3849DAf6845e3EC8680872222",
          callDepth: 0,
          payload: {
            ...basePayload,
            funcName: "first"
          }
        },
        {
          ...baseMessage,
          from: "0x11116FECD516Ecc3849DAf6845e3EC8680872222",
          to: "0x22226FECD516Ecc3849DAf6845e3EC8680873333",
          callDepth: 1,
          id: 1,
          payload: {
            ...basePayload,
            funcName: "second"
          }
        },
        {
          ...baseMessage,
          from: "0x11116FECD516Ecc3849DAf6845e3EC8680872222",
          to: "0x333365fe5446d880f8ec261d9224166909124444",
          callDepth: 1,
          id: 2,
          payload: {
            ...basePayload,
            funcName: "third"
          }
        }
      ]
      const plantUml = genMessages(messages)
      console.log(plantUml)
      expect(plantUml).toEqual(
        "\n00001111 -> 11112222: first\n" +
          "activate 11112222\n" +
          "11112222 -> 22223333: second\n" +
          "activate 22223333\n" +
          "return\n" +
          "11112222 -> 33334444: third\n" +
          "activate 33334444\n" +
          "return\n" +
          "return\n"
      )
    })
    test("0->1->2 1->0", () => {
      const messages: Message[] = [
        {
          ...baseMessage,
          from: "0x0000324fd7df8b2a969969bcc3663d74f0581111",
          to: "0x11116FECD516Ecc3849DAf6845e3EC8680872222",
          callDepth: 0,
          payload: {
            ...basePayload,
            funcName: "first"
          }
        },
        {
          ...baseMessage,
          from: "0x11116FECD516Ecc3849DAf6845e3EC8680872222",
          to: "0x22226FECD516Ecc3849DAf6845e3EC8680873333",
          callDepth: 1,
          id: 1,
          payload: {
            ...basePayload,
            funcName: "second"
          }
        },
        {
          ...baseMessage,
          from: "0x11116FECD516Ecc3849DAf6845e3EC8680872222",
          to: "0x0000324fd7df8b2a969969bcc3663d74f0581111",
          callDepth: 0,
          id: 2,
          payload: {
            ...basePayload,
            funcName: "third"
          }
        }
      ]
      const plantUml = genMessages(messages)
      console.log(plantUml)
      expect(plantUml).toEqual(
        "\n00001111 -> 11112222: first\n" +
          "activate 11112222\n" +
          "11112222 -> 22223333: second\n" +
          "activate 22223333\n" +
          "return\n" +
          "11112222 -> 00001111: third\n" +
          "activate 00001111\n" +
          "return\n" +
          "return\n"
      )
    })
    test("0->1->2->0->1", () => {
      const messages: Message[] = [
        {
          ...baseMessage,
          from: "0x0000324fd7df8b2a969969bcc3663d74f0581111",
          to: "0x11116FECD516Ecc3849DAf6845e3EC8680872222",
          callDepth: 0,
          payload: {
            ...basePayload,
            funcName: "first"
          }
        },
        {
          ...baseMessage,
          from: "0x11116FECD516Ecc3849DAf6845e3EC8680872222",
          to: "0x22226FECD516Ecc3849DAf6845e3EC8680873333",
          callDepth: 1,
          id: 1,
          payload: {
            ...basePayload,
            funcName: "second"
          }
        },
        {
          ...baseMessage,
          from: "0x22226FECD516Ecc3849DAf6845e3EC8680873333",
          to: "0x0000324fd7df8b2a969969bcc3663d74f0581111",
          callDepth: 2,
          id: 2,
          payload: {
            ...basePayload,
            funcName: "third"
          }
        },
        {
          ...baseMessage,
          from: "0x0000324fd7df8b2a969969bcc3663d74f0581111",
          to: "0x11116FECD516Ecc3849DAf6845e3EC8680872222",
          callDepth: 0,
          id: 3,
          payload: {
            ...basePayload,
            funcName: "forth"
          }
        }
      ]
      const plantUml = genMessages(messages)
      console.log(plantUml)
      expect(plantUml).toEqual(
        "\n00001111 -> 11112222: first\n" +
          "activate 11112222\n" +
          "11112222 -> 22223333: second\n" +
          "activate 22223333\n" +
          "22223333 -> 00001111: third\n" +
          "activate 00001111\n" +
          "00001111 -> 11112222: forth\n" +
          "activate 11112222\n" +
          "return\n" +
          "return\n" +
          "return\n" +
          "return\n"
      )
    })
    test("0->1->3->2", () => {
      const messages: Message[] = [
        {
          ...baseMessage,
          from: "0x0000324fd7df8b2a969969bcc3663d74f0581111",
          to: "0x11116FECD516Ecc3849DAf6845e3EC8680872222",
          callDepth: 0,
          payload: {
            ...basePayload,
            funcName: "first"
          }
        },
        {
          ...baseMessage,
          from: "0x11116FECD516Ecc3849DAf6845e3EC8680872222",
          to: "0x333365fe5446d880f8ec261d9224166909124444",
          callDepth: 1,
          payload: {
            ...basePayload,
            funcName: "second"
          }
        },
        {
          ...baseMessage,
          from: "0x333365fe5446d880f8ec261d9224166909124444",
          to: "0x22226FECD516Ecc3849DAf6845e3EC8680873333",
          callDepth: 3,
          payload: {
            ...basePayload,
            funcName: "third"
          }
        }
      ]
      const plantUml = genMessages(messages)
      console.log(plantUml)
      expect(plantUml).toEqual(
        "\n00001111 -> 11112222: first\n" +
          "activate 11112222\n" +
          "11112222 -> 33334444: second\n" +
          "activate 33334444\n" +
          "33334444 -> 22223333: third\n" +
          "activate 22223333\n" +
          "return\n" +
          "return\n" +
          "return\n"
      )
    })
  })
})
