"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.transactionHashes = exports.transactionHash = exports.bytes64 = exports.bytes32 = exports.bytes4 = exports.bytes = exports.ethereumAddresses = exports.ethereumAddress = void 0;
exports.ethereumAddress = /^0x([A-Fa-f0-9]{40})$/;
// comma-separated list of addresses with no whitespace
exports.ethereumAddresses = /^(0x[A-Fa-f0-9]{40},?)+$/;
exports.bytes = /^0x([A-Fa-f0-9]{1,})$/;
exports.bytes4 = /^0x([A-Fa-f0-9]{8})$/;
exports.bytes32 = /^0x([A-Fa-f0-9]{64})$/;
exports.bytes64 = /^0x([A-Fa-f0-9]{128})$/;
exports.transactionHash = exports.bytes32;
// one or more comma-separated transaction hashes
exports.transactionHashes = /^(0x[A-Fa-f0-9]{64},?)+$/;
//# sourceMappingURL=regEx.js.map