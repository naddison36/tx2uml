"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.transactionHash = exports.bytes64 = exports.bytes32 = exports.bytes4 = exports.bytes = exports.ethereumAddress = void 0;
/*eslint require-unicode-regexp: error */
// @see {@link https://eslint.org/docs/rules/require-unicode-regexp}
exports.ethereumAddress = /^0x([A-Fa-f0-9]{40})$/;
exports.bytes = /^0x([A-Fa-f0-9]{1,})$/;
exports.bytes4 = /^0x([A-Fa-f0-9]{8})$/;
exports.bytes32 = /^0x([A-Fa-f0-9]{64})$/;
exports.bytes64 = /^0x([A-Fa-f0-9]{128})$/;
exports.transactionHash = exports.bytes32;
//# sourceMappingURL=regEx.js.map