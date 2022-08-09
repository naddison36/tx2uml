import { writeMessages, writeParticipants } from "../plantUmlStreamer"
import { Contracts, MessageType, Trace } from "../transaction"
import { Readable } from "stream"
import { BigNumber } from "ethers"

const baseTrace: Trace = {
    id: 0,
    type: MessageType.Call,
    from: "0x00007F958D2ee523a2206206994597C13D831111",
    delegatedFrom: "0x00007F958D2ee523a2206206994597C13D831111",
    to: "0x11116FECD516Ecc3849DAf6845e3EC8680872222",
    value: BigNumber.from(0),
    gasUsed: BigNumber.from(1234),
    gasLimit: BigNumber.from(2),
    error: undefined,
    funcName: "someFunc",
    funcSelector: "0a5ea466",
    inputParams: [],
    outputParams: [],
    childTraces: [],
    depth: 0,
}

const testContracts: Contracts = {
    "0x0000324fd7df8b2a969969bcc3663d74f0581111": {
        address: "0x0000324fd7df8b2a969969bcc3663d74f0581111",
    },
    "0x11116FECD516Ecc3849DAf6845e3EC8680872222": {
        address: "0x11116FECD516Ecc3849DAf6845e3EC8680872222",
        contractName: "Controller",
    },
    "0x22226FECD516Ecc3849DAf6845e3EC8680873333": {
        address: "0x22226FECD516Ecc3849DAf6845e3EC8680873333",
        contractName: "Proxy",
    },
    "0x333365fe5446d880f8ec261d9224166909124444": {
        address: "0x333365fe5446d880f8ec261d9224166909124444",
        contractName: "DeFiApp",
    },
    "0x44447296C1DE2Ed53348A3B23AD56797b75a5555": {
        address: "0x4fc67296C1DE2Ed53348A3B23AD56797b75aAA8C",
        contractName: "Hacker",
    },
    "0x555538e6266DE92C1E449cBd89C5c202583b6666": {
        address: "0xDc3138e6266DE92C1E449cBd89C5c202583b62eD",
        contractName: "Oracle",
    },
}

const stream = new Readable({
    read() {},
})

describe("Stream Plant UML", () => {
    test("List participants", () => {
        writeParticipants(stream, testContracts)
        const plantUmlBuf = stream.read()
        expect(plantUmlBuf.toString()).toEqual(
            '\nactor "0x0000..1111" as 00001111\n' +
                'participant "0x1111..2222" as 11112222 <<Controller>>\n' +
                'participant "0x2222..3333" as 22223333 <<Proxy>>\n' +
                'participant "0x3333..4444" as 33334444 <<DeFiApp>>\n' +
                'participant "0x4444..5555" as 44445555 <<Hacker>>\n' +
                'participant "0x5555..6666" as 55556666 <<Oracle>>\n'
        )
    })

    describe("Messages", () => {
        test("0->1", () => {
            const traces: Trace[] = [
                {
                    ...baseTrace,
                    to: "0x11116FECD516Ecc3849DAf6845e3EC8680872222",
                    funcName: "first",
                },
            ]
            writeMessages(stream, traces)
            const plantUmlBuf = stream.read()
            expect(plantUmlBuf.toString()).toEqual(
                "\n00001111 -> 11112222: first()\\n1,234 gas\n" +
                    "activate 11112222\n" +
                    "return\n"
            )
        })
        test("0->1->2", () => {
            const traces: Trace[] = [
                {
                    ...baseTrace,
                    to: "0x11116FECD516Ecc3849DAf6845e3EC8680872222",
                    funcName: "first",
                },
                {
                    ...baseTrace,
                    from: "0x11116FECD516Ecc3849DAf6845e3EC8680872222",
                    delegatedFrom: "0x11116FECD516Ecc3849DAf6845e3EC8680872222",
                    to: "0x22226FECD516Ecc3849DAf6845e3EC8680873333",
                    id: 1,
                    funcName: "second",
                    gasUsed: BigNumber.from(12345),
                },
            ]
            writeMessages(stream, traces)
            const plantUmlBuf = stream.read()
            expect(plantUmlBuf.toString()).toEqual(
                "\n00001111 -> 11112222: first()\\n1,234 gas\n" +
                    "activate 11112222\n" +
                    "11112222 -> 22223333: second()\\n12,345 gas\n" +
                    "activate 22223333\n" +
                    "return\n" +
                    "return\n"
            )
        })
        test("0->1 0->1", () => {
            const traces: Trace[] = [
                {
                    ...baseTrace,
                    to: "0x11116FECD516Ecc3849DAf6845e3EC8680872222",
                    funcName: "first",
                },
                {
                    ...baseTrace,
                    to: "0x11116FECD516Ecc3849DAf6845e3EC8680872222",
                    id: 1,
                    funcName: "second",
                    gasUsed: BigNumber.from(12345),
                },
            ]
            writeMessages(stream, traces)
            const plantUmlBuf = stream.read()
            expect(plantUmlBuf.toString()).toEqual(
                "\n00001111 -> 11112222: first()\\n1,234 gas\n" +
                    "activate 11112222\n" +
                    "return\n" +
                    "00001111 -> 11112222: second()\\n12,345 gas\n" +
                    "activate 11112222\n" +
                    "return\n"
            )
        })
        test("0->1->2 0->2", () => {
            const traces: Trace[] = [
                {
                    ...baseTrace,
                    from: "0x0000324fd7df8b2a969969bcc3663d74f0581111",
                    to: "0x11116FECD516Ecc3849DAf6845e3EC8680872222",
                    funcName: "first",
                },
                {
                    ...baseTrace,
                    from: "0x11116FECD516Ecc3849DAf6845e3EC8680872222",
                    delegatedFrom: "0x11116FECD516Ecc3849DAf6845e3EC8680872222",
                    to: "0x22226FECD516Ecc3849DAf6845e3EC8680873333",
                    id: 1,
                    funcName: "second",
                },
                {
                    ...baseTrace,
                    to: "0x22226FECD516Ecc3849DAf6845e3EC8680873333",
                    id: 2,
                    funcName: "third",
                },
            ]
            writeMessages(stream, traces)
            const plantUmlBuf = stream.read()
            expect(plantUmlBuf.toString()).toEqual(
                "\n00001111 -> 11112222: first()\\n1,234 gas\n" +
                    "activate 11112222\n" +
                    "11112222 -> 22223333: second()\\n1,234 gas\n" +
                    "activate 22223333\n" +
                    "return\n" +
                    "return\n" +
                    "00001111 -> 22223333: third()\\n1,234 gas\n" +
                    "activate 22223333\n" +
                    "return\n"
            )
        })
        test("0->1->2 1->3", () => {
            const traces: Trace[] = [
                {
                    ...baseTrace,
                    to: "0x11116FECD516Ecc3849DAf6845e3EC8680872222",
                    funcName: "first",
                },
                {
                    ...baseTrace,
                    from: "0x11116FECD516Ecc3849DAf6845e3EC8680872222",
                    delegatedFrom: "0x11116FECD516Ecc3849DAf6845e3EC8680872222",
                    to: "0x22226FECD516Ecc3849DAf6845e3EC8680873333",
                    id: 1,
                    funcName: "second",
                },
                {
                    ...baseTrace,
                    from: "0x11116FECD516Ecc3849DAf6845e3EC8680872222",
                    delegatedFrom: "0x11116FECD516Ecc3849DAf6845e3EC8680872222",
                    to: "0x333365fe5446d880f8ec261d9224166909124444",
                    id: 2,
                    funcName: "third",
                },
            ]
            writeMessages(stream, traces)
            const plantUmlBuf = stream.read()
            expect(plantUmlBuf.toString()).toEqual(
                "\n00001111 -> 11112222: first()\\n1,234 gas\n" +
                    "activate 11112222\n" +
                    "11112222 -> 22223333: second()\\n1,234 gas\n" +
                    "activate 22223333\n" +
                    "return\n" +
                    "11112222 -> 33334444: third()\\n1,234 gas\n" +
                    "activate 33334444\n" +
                    "return\n" +
                    "return\n"
            )
        })
        test("0->1->2 1->0", () => {
            const traces: Trace[] = [
                {
                    ...baseTrace,
                    to: "0x11116FECD516Ecc3849DAf6845e3EC8680872222",
                    funcName: "first",
                },
                {
                    ...baseTrace,
                    from: "0x11116FECD516Ecc3849DAf6845e3EC8680872222",
                    delegatedFrom: "0x11116FECD516Ecc3849DAf6845e3EC8680872222",
                    to: "0x22226FECD516Ecc3849DAf6845e3EC8680873333",
                    id: 1,
                    funcName: "second",
                },
                {
                    ...baseTrace,
                    from: "0x11116FECD516Ecc3849DAf6845e3EC8680872222",
                    delegatedFrom: "0x11116FECD516Ecc3849DAf6845e3EC8680872222",
                    to: "0x0000324fd7df8b2a969969bcc3663d74f0581111",
                    id: 2,
                    funcName: "third",
                },
            ]
            writeMessages(stream, traces)
            const plantUmlBuf = stream.read()
            expect(plantUmlBuf.toString()).toEqual(
                "\n00001111 -> 11112222: first()\\n1,234 gas\n" +
                    "activate 11112222\n" +
                    "11112222 -> 22223333: second()\\n1,234 gas\n" +
                    "activate 22223333\n" +
                    "return\n" +
                    "11112222 -> 00001111: third()\\n1,234 gas\n" +
                    "activate 00001111\n" +
                    "return\n" +
                    "return\n"
            )
        })
        test("0->1->2->0->1", () => {
            const traces: Trace[] = [
                {
                    ...baseTrace,
                    to: "0x11116FECD516Ecc3849DAf6845e3EC8680872222",
                    funcName: "first",
                },
                {
                    ...baseTrace,
                    from: "0x11116FECD516Ecc3849DAf6845e3EC8680872222",
                    delegatedFrom: "0x11116FECD516Ecc3849DAf6845e3EC8680872222",
                    to: "0x22226FECD516Ecc3849DAf6845e3EC8680873333",
                    id: 1,
                    funcName: "second",
                },
                {
                    ...baseTrace,
                    from: "0x22226FECD516Ecc3849DAf6845e3EC8680873333",
                    delegatedFrom: "0x22226FECD516Ecc3849DAf6845e3EC8680873333",
                    to: "0x00007F958D2ee523a2206206994597C13D831111",
                    id: 2,
                    funcName: "third",
                },
                {
                    ...baseTrace,
                    to: "0x11116FECD516Ecc3849DAf6845e3EC8680872222",
                    id: 3,
                    funcName: "forth",
                },
            ]
            writeMessages(stream, traces)
            const plantUmlBuf = stream.read()
            expect(plantUmlBuf.toString()).toEqual(
                "\n00001111 -> 11112222: first()\\n1,234 gas\n" +
                    "activate 11112222\n" +
                    "11112222 -> 22223333: second()\\n1,234 gas\n" +
                    "activate 22223333\n" +
                    "22223333 -> 00001111: third()\\n1,234 gas\n" +
                    "activate 00001111\n" +
                    "00001111 -> 11112222: forth()\\n1,234 gas\n" +
                    "activate 11112222\n" +
                    "return\n" +
                    "return\n" +
                    "return\n" +
                    "return\n"
            )
        })
        test("0->1->3->2", () => {
            const traces: Trace[] = [
                {
                    ...baseTrace,
                    to: "0x11116FECD516Ecc3849DAf6845e3EC8680872222",
                    funcName: "first",
                },
                {
                    ...baseTrace,
                    from: "0x11116FECD516Ecc3849DAf6845e3EC8680872222",
                    delegatedFrom: "0x11116FECD516Ecc3849DAf6845e3EC8680872222",
                    to: "0x333365fe5446d880f8ec261d9224166909124444",
                    funcName: "second",
                },
                {
                    ...baseTrace,
                    from: "0x333365fe5446d880f8ec261d9224166909124444",
                    delegatedFrom: "0x333365fe5446d880f8ec261d9224166909124444",
                    to: "0x22226FECD516Ecc3849DAf6845e3EC8680873333",
                    funcName: "third",
                },
            ]
            writeMessages(stream, traces)
            const plantUmlBuf = stream.read()
            expect(plantUmlBuf.toString()).toEqual(
                "\n00001111 -> 11112222: first()\\n1,234 gas\n" +
                    "activate 11112222\n" +
                    "11112222 -> 33334444: second()\\n1,234 gas\n" +
                    "activate 33334444\n" +
                    "33334444 -> 22223333: third()\\n1,234 gas\n" +
                    "activate 22223333\n" +
                    "return\n" +
                    "return\n" +
                    "return\n"
            )
        })
        test("0->1->0 1->2", () => {
            const traces: Trace[] = [
                {
                    ...baseTrace,
                    to: "0x11116FECD516Ecc3849DAf6845e3EC8680872222",
                    funcName: "first call",
                },
                {
                    ...baseTrace,
                    from: "0x11116FECD516Ecc3849DAf6845e3EC8680872222",
                    delegatedFrom: "0x11116FECD516Ecc3849DAf6845e3EC8680872222",
                    to: "0x0000324fd7df8b2a969969bcc3663d74f0581111",
                    id: 1,
                    funcSelector: undefined,
                    value: BigNumber.from("1100000000000000000"),
                    gasUsed: BigNumber.from(0),
                },
                {
                    ...baseTrace,
                    from: "0x11116FECD516Ecc3849DAf6845e3EC8680872222",
                    delegatedFrom: "0x11116FECD516Ecc3849DAf6845e3EC8680872222",
                    to: "0x22226FECD516Ecc3849DAf6845e3EC8680873333",
                    id: 2,
                    funcName: "third call",
                },
            ]
            writeMessages(stream, traces)
            const plantUmlBuf = stream.read()
            expect(plantUmlBuf.toString()).toEqual(
                "\n00001111 -> 11112222: first call()\\n1,234 gas\n" +
                    "activate 11112222\n" +
                    "11112222 -> 00001111: fallback()\\n0 gas\\n1.1 ETH\n" +
                    "activate 00001111\n" +
                    "return\n" +
                    "11112222 -> 22223333: third call()\\n1,234 gas\n" +
                    "activate 22223333\n" +
                    "return\n" +
                    "return\n"
            )
        })
        test("0->1->2-D>3 2->4->5 2->4 2->4 1->2->4", () => {
            const traces: Trace[] = [
                {
                    ...baseTrace,
                    to: "0x11116FECD516Ecc3849DAf6845e3EC8680872222",
                    funcName: "first call",
                },
                {
                    ...baseTrace,
                    from: "0x11116FECD516Ecc3849DAf6845e3EC8680872222",
                    delegatedFrom: "0x11116FECD516Ecc3849DAf6845e3EC8680872222",
                    to: "0x22226FECD516Ecc3849DAf6845e3EC8680873333",
                    id: 1,
                    funcName: "second call",
                },
                {
                    ...baseTrace,
                    from: "0x22226FECD516Ecc3849DAf6845e3EC8680873333",
                    delegatedFrom: "0x22226FECD516Ecc3849DAf6845e3EC8680873333",
                    to: "0x333365fe5446d880f8ec261d9224166909124444",
                    id: 2,
                    funcName: "delegate call",
                    type: MessageType.DelegateCall,
                },
                {
                    ...baseTrace,
                    from: "0x22226FECD516Ecc3849DAf6845e3EC8680873333",
                    delegatedFrom: "0x333365fe5446d880f8ec261d9224166909124444",
                    to: "0x44447296C1DE2Ed53348A3B23AD56797b75a5555",
                    id: 3,
                    funcName: "1st delegated call from 0x2222..3333",
                },
                {
                    ...baseTrace,
                    from: "0x44447296C1DE2Ed53348A3B23AD56797b75a5555",
                    delegatedFrom: "0x44447296C1DE2Ed53348A3B23AD56797b75a5555",
                    to: "0x555538e6266DE92C1E449cBd89C5c202583b6666",
                    id: 4,
                    funcName: "not a delegate call",
                },
                {
                    ...baseTrace,
                    from: "0x22226FECD516Ecc3849DAf6845e3EC8680873333",
                    delegatedFrom: "0x333365fe5446d880f8ec261d9224166909124444",
                    to: "0x44447296C1DE2Ed53348A3B23AD56797b75a5555",
                    id: 5,
                    funcName: "2nd delegated call from 0x2222..3333",
                },
                {
                    ...baseTrace,
                    from: "0x22226FECD516Ecc3849DAf6845e3EC8680873333",
                    delegatedFrom: "0x22226FECD516Ecc3849DAf6845e3EC8680873333",
                    to: "0x44447296C1DE2Ed53348A3B23AD56797b75a5555",
                    id: 6,
                    funcName: "not a delegate call",
                },
                {
                    ...baseTrace,
                    from: "0x11116FECD516Ecc3849DAf6845e3EC8680872222",
                    delegatedFrom: "0x11116FECD516Ecc3849DAf6845e3EC8680872222",
                    to: "0x22226FECD516Ecc3849DAf6845e3EC8680873333",
                    id: 7,
                    funcName: "not a delegate call",
                },
                {
                    ...baseTrace,
                    from: "0x22226FECD516Ecc3849DAf6845e3EC8680873333",
                    delegatedFrom: "0x22226FECD516Ecc3849DAf6845e3EC8680873333",
                    to: "0x44447296C1DE2Ed53348A3B23AD56797b75a5555",
                    id: 8,
                    funcName: "not a delegate call",
                },
            ]
            traces[3].parentTrace = traces[2]
            traces[5].parentTrace = traces[2]
            writeMessages(stream, traces)
            const plantUmlBuf = stream.read()
            expect(plantUmlBuf.toString()).toEqual(
                "\n00001111 -> 11112222: first call()\\n1,234 gas\n" +
                    "activate 11112222\n" +
                    "11112222 -> 22223333: second call()\\n1,234 gas\n" +
                    "activate 22223333\n" +
                    "22223333 ->> 33334444: delegate call()\\n1,234 gas\n" +
                    "activate 33334444 #809ECB\n" +
                    "22223333 -[#3471CD]> 44445555: 1st delegated call from 0x2222..3333()\\n1,234 gas\n" +
                    "activate 44445555\n" +
                    "44445555 -> 55556666: not a delegate call()\\n1,234 gas\n" +
                    "activate 55556666\n" +
                    "return\n" +
                    "return\n" +
                    "22223333 -[#3471CD]> 44445555: 2nd delegated call from 0x2222..3333()\\n1,234 gas\n" +
                    "activate 44445555\n" +
                    "return\n" +
                    "return\n" +
                    "22223333 -> 44445555: not a delegate call()\\n1,234 gas\n" +
                    "activate 44445555\n" +
                    "return\n" +
                    "return\n" +
                    "11112222 -> 22223333: not a delegate call()\\n1,234 gas\n" +
                    "activate 22223333\n" +
                    "22223333 -> 44445555: not a delegate call()\\n1,234 gas\n" +
                    "activate 44445555\n" +
                    "return\n" +
                    "return\n" +
                    "return\n"
            )
        })
    })
})
