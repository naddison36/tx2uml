"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.outputFormats = exports.setChainId = exports.setNetworkCurrency = exports.networks = exports.nodeTypes = exports.TransferType = exports.MessageType = void 0;
var MessageType;
(function (MessageType) {
    MessageType[MessageType["Unknown"] = 0] = "Unknown";
    MessageType[MessageType["Call"] = 1] = "Call";
    MessageType[MessageType["Create"] = 2] = "Create";
    MessageType[MessageType["Selfdestruct"] = 3] = "Selfdestruct";
    MessageType[MessageType["DelegateCall"] = 4] = "DelegateCall";
    MessageType[MessageType["StaticCall"] = 5] = "StaticCall";
})(MessageType || (exports.MessageType = MessageType = {}));
var TransferType;
(function (TransferType) {
    TransferType[TransferType["Transfer"] = 0] = "Transfer";
    TransferType[TransferType["Mint"] = 1] = "Mint";
    TransferType[TransferType["Burn"] = 2] = "Burn";
})(TransferType || (exports.TransferType = TransferType = {}));
exports.nodeTypes = [
    "geth",
    "erigon",
    "nether",
    "openeth",
    "tgeth",
    "besu",
    "anvil",
    "reth",
];
exports.networks = [
    "ethereum",
    "custom",
    "none",
    "sepolia",
    "holesky",
    "hoodi",
    "arbitrum",
    "optimisim",
    "polygon",
    "avalanche",
    "base",
    "bsc",
    "crono",
    "fantom",
    "sonic",
    "gnosis",
    "moonbeam",
    "celo",
    "scroll",
    "linea",
    "blast",
    "berachain",
    "zksync",
];
const setNetworkCurrency = (network) => network === "avalanche"
    ? "AVAX"
    : network === "polygon"
        ? "MATIC"
        : network === "bsc"
            ? "BNB"
            : network === "crono"
                ? "CRO"
                : network === "fantom"
                    ? "FTM"
                    : network === "gnosis"
                        ? "xDAI"
                        : network === "moonbeam"
                            ? "GLMR"
                            : network === "celo"
                                ? "CELO"
                                : network === "sonic"
                                    ? "S"
                                    : network === "berachain"
                                        ? "BERA"
                                        : network === "blast"
                                            ? "BLAST"
                                            : "ETH";
exports.setNetworkCurrency = setNetworkCurrency;
const setChainId = (network) => 
// If an integer is passed, return it as is
/^-?(0|[1-9]\d*)$/.test(network)
    ? parseInt(network)
    : network === "sepolia"
        ? 11155111
        : network === "holesky"
            ? 17000
            : network === "hoodi"
                ? 560048
                : network === "arbitrum"
                    ? 42161
                    : network === "optimisim"
                        ? 10
                        : network === "polygon"
                            ? 137
                            : network === "avalanche"
                                ? 43114
                                : network === "base"
                                    ? 8453
                                    : network === "bsc"
                                        ? 56
                                        : network === "crono"
                                            ? 25
                                            : network === "fantom"
                                                ? 250
                                                : network === "sonic"
                                                    ? 146
                                                    : network === "gnosis"
                                                        ? 100
                                                        : network === "moonbeam"
                                                            ? 1284
                                                            : network === "celo"
                                                                ? 42220
                                                                : network === "scroll"
                                                                    ? 534352
                                                                    : network === "linea"
                                                                        ? 59144
                                                                        : network === "blast"
                                                                            ? 81457
                                                                            : network === "berachain"
                                                                                ? 80094
                                                                                : network === "zksync"
                                                                                    ? 324
                                                                                    : 1;
exports.setChainId = setChainId;
exports.outputFormats = ["png", "svg", "eps", "puml"];
//# sourceMappingURL=tx2umlTypes.js.map