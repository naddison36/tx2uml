"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadLabels = void 0;
const path_1 = require("path");
const fs_1 = __importDefault(require("fs"));
const debug = require("debug")("tx2uml");
const loadLabels = (network) => {
    const parentFolder = (0, path_1.join)(__dirname, `..`);
    debug(`Label __dirname ${__dirname}`);
    // Try and get Etherscan labels from local file
    const labelsFile = 
    // get parent folder name of parent
    (0, path_1.basename)(parentFolder) === "ts"
        ? // running as ts-node
            (0, path_1.join)(parentFolder, `../../lib/labels/${network}.json`)
        : // running a node js
            (0, path_1.join)(parentFolder, `./labels/${network}.json`);
    if (fs_1.default.existsSync(labelsFile)) {
        debug(`Loading labels from ${labelsFile}`);
        return require(labelsFile);
    }
    debug(`Failed to load labels from ${labelsFile}`);
    return {};
};
exports.loadLabels = loadLabels;
//# sourceMappingURL=labels.js.map