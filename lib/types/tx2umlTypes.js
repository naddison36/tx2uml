"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.outputFormats = exports.networks = exports.TransferType = exports.MessageType = void 0;
var MessageType;
(function (MessageType) {
    MessageType[MessageType["Unknown"] = 0] = "Unknown";
    MessageType[MessageType["Call"] = 1] = "Call";
    MessageType[MessageType["Create"] = 2] = "Create";
    MessageType[MessageType["Selfdestruct"] = 3] = "Selfdestruct";
    MessageType[MessageType["DelegateCall"] = 4] = "DelegateCall";
    MessageType[MessageType["StaticCall"] = 5] = "StaticCall";
})(MessageType = exports.MessageType || (exports.MessageType = {}));
var TransferType;
(function (TransferType) {
    TransferType[TransferType["Transfer"] = 0] = "Transfer";
    TransferType[TransferType["Mint"] = 1] = "Mint";
    TransferType[TransferType["Burn"] = 2] = "Burn";
})(TransferType = exports.TransferType || (exports.TransferType = {}));
exports.networks = [
    "mainnet",
    "goerli",
    "sepolia",
    "polygon",
    "testnet.polygon",
    "arbitrum",
    "testnet.arbitrum",
    "avalanche",
    "testnet.avalanche",
    "bsc",
    "testnet.bsc",
    "crono",
    "fantom",
    "testnet.fantom",
    "moonbeam",
    "optimistic",
    "kovan-optimistic",
    "gnosisscan",
];
exports.outputFormats = ["png", "svg", "eps", "puml"];
//# sourceMappingURL=tx2umlTypes.js.map