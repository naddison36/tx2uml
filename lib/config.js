"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadConfig = void 0;
const fs_1 = require("fs");
const debug = require("debug")("tx2uml");
const loadConfig = async (fileName = "./tx.config.json") => {
    let config = {};
    if ((0, fs_1.existsSync)(fileName)) {
        config = JSON.parse((0, fs_1.readFileSync)(fileName, "utf-8"));
        debug(`loaded config file ${fileName}`);
    }
    return config;
};
exports.loadConfig = loadConfig;
//# sourceMappingURL=config.js.map