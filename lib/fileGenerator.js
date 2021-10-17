"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateFile = void 0;
const fs_1 = require("fs");
const verror_1 = __importDefault(require("verror"));
const plantuml_1 = require("./plantuml");
const debug = require("debug")("tx2uml");
const generateFile = async (pumlStream, options = {}) => {
    const filename = constructFilename(options.filename, options.format);
    try {
        const outputStream = (0, fs_1.createWriteStream)(filename);
        if (options.format === "puml") {
            pumlStream.pipe(outputStream);
            debug(`Plant UML file written to ${filename} in raw puml format`);
        }
        else if (plantuml_1.outputFormats.includes(options.format)) {
            await (0, plantuml_1.streamPlantUml)(pumlStream, outputStream, {
                format: options.format,
                limitSize: 60000,
            });
            debug(`Plant UML file written to ${filename} in ${options.format} format.`);
        }
        else {
            throw new Error(`Output format ${options.format} is not supported. Only the following formats are supported: ${plantuml_1.outputFormats}.`);
        }
    }
    catch (err) {
        throw new verror_1.default(err, `Failed to write to file ${filename}.`);
    }
};
exports.generateFile = generateFile;
const constructFilename = (filename, format = "png") => {
    if (!filename || filename === "") {
        return `output.${format}`;
    }
    const fileExtension = filename.slice(-4);
    if (["puml", ".png", ".svg", ".eps"].includes(fileExtension)) {
        return filename;
    }
    return filename + "." + format;
};
//# sourceMappingURL=fileGenerator.js.map