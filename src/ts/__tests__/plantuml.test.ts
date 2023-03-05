import { streamPlantUml } from "../plantuml"
import { Readable, Writable } from "stream"
import { createWriteStream } from "fs"

jest.setTimeout(30000) // timeout for each test in milliseconds

let outputPng: Writable

describe("Test Plant UML", () => {
    beforeEach(() => {
        outputPng = createWriteStream("output.png")
    })
    test("No options", async () => {
        const plantUmlStream = Readable.from(`
  @startuml

  participant "0x0000..1111" as 00001111
  participant "0x1111..2222" as 11112222
  participant "0x2222..3333" as 22223333
  participant "0x3333..4444" as 33334444
  participant "0x3333..4444" as 44445555

  00001111 -> 11112222: first call
  activate 11112222
  11112222 -> 22223333: second call
  activate 22223333
  return
  return

  @endumls`)
        const exitCode = await streamPlantUml(plantUmlStream, outputPng, {})
        expect(exitCode).toEqual(0)
    })

    test("Invalid Plant UML", async () => {
        const plantUmlStream = Readable.from("invalid")
        expect.assertions(1)
        try {
            await streamPlantUml(plantUmlStream, outputPng, {})
        } catch (err) {
            expect(err).toBeInstanceOf(Error)
        }
    })

    test("Syntax error", async () => {
        const plantUmlStream = Readable.from(`
@startuml
XXXparticipant "0x0000..1111" as 00001111
participant "0x1111..2222" as 11112222
00001111 -> 11112222: first call
@endumls`)
        expect.assertions(1)
        try {
            await streamPlantUml(plantUmlStream, outputPng, {})
        } catch (err) {
            expect(err).toBeInstanceOf(Error)
        }
    })
})
