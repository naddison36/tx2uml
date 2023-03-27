"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadLabels = void 0;
const path_1 = require("path");
const fs_1 = __importDefault(require("fs"));
const loadLabels = (network) => {
    // Try and get Etherscan labels from local file
    const labelsFile = (0, path_1.basename)(__dirname) === "lib"
        ? `./${network}.json`
        : `../../lib/${network}.json`;
    return fs_1.default.existsSync(labelsFile) ? require(labelsFile) : {};
};
exports.loadLabels = loadLabels;
//# sourceMappingURL=labels.js.map