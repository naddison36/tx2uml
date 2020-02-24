"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// @ts-ignore no @types/node-plantuml
const node_plantuml_1 = __importDefault(require("node-plantuml"));
const fs_1 = require("fs");
const verror_1 = __importDefault(require("verror"));
const debug = require("debug")("tx2uml");
exports.generateFile = async (plantUml, options = {}) => {
    const filename = constructFilename(options.filename, options.format);
    if (options.format === "puml") {
        fs_1.writeFile(filename, plantUml, err => {
            if (err) {
                throw new verror_1.default(err, `Failed to write plant UML file to ${filename} in raw puml format.`);
            }
            else {
                debug(`Plant UML file written to ${filename} in raw puml format`);
            }
        });
    }
    else if (options.format === "png" || options.format === "svg") {
        const generator = node_plantuml_1.default.generate(plantUml, { format: options.format }, (err) => {
            if (err) {
                throw new verror_1.default(err, `Failed to write plant UML file to ${filename} in ${options.format} format`);
            }
            else {
                debug(`Plant UML file written to ${filename} in ${options.format} format.`);
            }
        });
        generator.out.pipe(fs_1.createWriteStream(filename));
    }
    else {
        throw new Error(`Output format ${options.format} is not supported. Only puml, png or svg formats are supported`);
    }
};
const constructFilename = (filename, format = "png") => {
    if (!filename || filename === "") {
        return `output.${format}`;
    }
    const fileExtension = filename.slice(-4);
    if (["puml", ".png", ".svg"].includes(fileExtension)) {
        return filename;
    }
    return filename + "." + format;
};
//# sourceMappingURL=fileGenerator.js.map