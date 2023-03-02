"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateFile = void 0;
const fs_1 = require("fs");
const plantuml_1 = require("./plantuml");
const tx2umlTypes_1 = require("./types/tx2umlTypes");
const debug = require("debug")("tx2uml");
const generateFile = async (pumlStream, options = {}) => {
    const filename = constructFilename(options.filename, options.format);
    try {
        const outputStream = (0, fs_1.createWriteStream)(filename);
        if (options.format === "puml") {
            pumlStream.pipe(outputStream);
            debug(`Plant UML file written to ${filename} in raw puml format`);
        }
        else if (tx2umlTypes_1.outputFormats.includes(options.format)) {
            await (0, plantuml_1.streamPlantUml)(pumlStream, outputStream, {
                format: options.format,
                limitSize: 60000,
            });
            debug(`Plant UML file written to ${filename} in ${options.format} format.`);
        }
        else {
            throw new Error(`Output format ${options.format} is not supported. Only the following formats are supported: ${tx2umlTypes_1.outputFormats}.`);
        }
    }
    catch (err) {
        throw new Error(`Failed to write to file ${filename}.`, { cause: err });
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