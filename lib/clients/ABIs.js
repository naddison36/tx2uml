"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TransferEventsABI = exports.TokenInfoABI = void 0;
exports.TokenInfoABI = [
    {
        inputs: [
            { internalType: "address[]", name: "tokens", type: "address[]" },
        ],
        name: "getInfoBatch",
        outputs: [
            {
                components: [
                    { internalType: "string", name: "symbol", type: "string" },
                    { internalType: "string", name: "name", type: "string" },
                    {
                        internalType: "uint256",
                        name: "decimals",
                        type: "uint256",
                    },
                    { internalType: "bool", name: "noContract", type: "bool" },
                    { internalType: "bool", name: "nft", type: "bool" },
                    { internalType: "string", name: "ensName", type: "string" },
                ],
                internalType: "struct TokenInfo.Info[]",
                name: "infos",
                type: "tuple[]",
            },
        ],
        stateMutability: "view",
        type: "function",
    },
];
exports.TransferEventsABI = [
    {
        anonymous: false,
        inputs: [
            {
                indexed: true,
                name: "owner",
                type: "address",
            },
            {
                indexed: true,
                name: "spender",
                type: "address",
            },
            {
                indexed: false,
                name: "value",
                type: "uint256",
            },
        ],
        name: "Approval",
        type: "event",
    },
    {
        anonymous: false,
        inputs: [
            {
                indexed: true,
                name: "from",
                type: "address",
            },
            {
                indexed: true,
                name: "to",
                type: "address",
            },
            {
                indexed: false,
                name: "value",
                type: "uint256",
            },
        ],
        name: "Transfer",
        type: "event",
    },
    {
        anonymous: false,
        inputs: [
            {
                indexed: true,
                name: "from",
                type: "address",
            },
            {
                indexed: true,
                name: "to",
                type: "address",
            },
            {
                indexed: true,
                name: "tokenId",
                type: "uint256",
            },
        ],
        name: "NFTTransfer",
        type: "event",
    },
];
//# sourceMappingURL=ABIs.js.map