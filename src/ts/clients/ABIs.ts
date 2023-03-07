export const TokenInfoABI = [
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
]

// Deep clone and then add ensName to ABI
export const TokenInfoEnsABI = JSON.parse(JSON.stringify(TokenInfoABI))
TokenInfoEnsABI[0].outputs[0].components.push({
    internalType: "string",
    name: "ensName",
    type: "string",
})
