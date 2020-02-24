"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.stringify = (obj) => {
    return JSON.stringify(obj, (key, value) => typeof value === "bigint" ? value.toString() : value);
};
//# sourceMappingURL=utils.js.map