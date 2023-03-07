"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TokenInfoEnsABI = exports.TokenInfoABI = void 0;
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
// Deep clone and then add ensName to ABI
exports.TokenInfoEnsABI = JSON.parse(JSON.stringify(exports.TokenInfoABI));
exports.TokenInfoEnsABI[0].outputs[0].components.push({
    internalType: "string",
    name: "ensName",
    type: "string",
});
//# sourceMappingURL=ABIs.js.map