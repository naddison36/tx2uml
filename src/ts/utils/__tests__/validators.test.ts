import {
    validateAddress,
    validateAddresses,
    validateDepth,
} from "../validators"

describe("Validators", () => {
    describe("valid address", () => {
        test.each([
            [
                "0xf7749B41db006860cEc0650D18b8013d69C44Eeb",
                "0xf7749B41db006860cEc0650D18b8013d69C44Eeb",
            ],
            [
                "0x1111111254fb6c44bac0bed2854e76f90643097d", // no checksum
                "0x1111111254fb6c44bAC0beD2854e76F90643097d",
            ],
        ])("%s", (address, expected) => {
            expect(validateAddress(address)).toEqual(expected)
        })
    })
    describe("invalid address", () => {
        test.each([
            "",
            "0xf7749B41db006860cEc0650D18b8013d69C44E",
            12,
            "0x",
            "XYZ",
            "0xf7749B41db006860cEc0650D18b8013d69C44Eeb,",
            ",0xf7749B41db006860cEc0650D18b8013d69C44Eeb",
        ])("%s", address => {
            // @ts-ignore
            expect(() => validateAddress(address)).toThrow(
                "Address must be in hexadecimal format with a 0x prefix"
            )
        })
    })
    describe("valid addresses", () => {
        test.each([
            [
                "0xf7749B41db006860cEc0650D18b8013d69C44Eeb",
                ["0xf7749B41db006860cEc0650D18b8013d69C44Eeb"],
            ],
            [
                "0x1111111254fb6c44bac0bed2854e76f90643097d",
                ["0x1111111254fb6c44bAC0beD2854e76F90643097d"],
            ],
            [
                "0xf7749B41db006860cEc0650D18b8013d69C44Eeb,0x1111111254fb6c44bac0bed2854e76f90643097d",
                [
                    "0xf7749B41db006860cEc0650D18b8013d69C44Eeb",
                    "0x1111111254fb6c44bAC0beD2854e76F90643097d",
                ],
            ],
        ])("%s", (address, expected) => {
            expect(validateAddresses(address)).toEqual(expected)
        })
    })
    describe("invalid addresses", () => {
        test.each([
            "",
            "0xf7749B41db006860cEc0650D18b8013d69C44E",
            12,
            "0x",
            "XYZ",
            "0xf7749B41db006860cEc0650D18b8013d69C44Eeb,",
            ",0xf7749B41db006860cEc0650D18b8013d69C44Eeb",
            ",",
        ])("%s", address => {
            // @ts-ignore
            expect(() => validateAddresses(address)).toThrow(
                "Must be address or an array of addresses in hexadecimal format with a 0x prefix"
            )
        })
    })
    describe("valid depth", () => {
        test.each([
            [0, 0],
            ["0", 0],
            ["1", 1],
            [1, 1],
            ["2", 2],
            ["10", 10],
            ["13", 13],
        ])("%s", (depth, expected) => {
            // @ts-ignore
            return expect(validateDepth(depth)).toEqual(expected)
        })
    })
    describe("invalid valid depth", () => {
        test.each(["-1", -2, "X", "depth"])("%s", depth => {
            // @ts-ignore
            expect(() => validateDepth(depth)).toThrow(
                "Must be a zero or a positive integer"
            )
        })
    })
})
