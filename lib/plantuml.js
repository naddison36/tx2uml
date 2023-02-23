"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.genPumlJavaOptions = exports.streamPlantUml = exports.outputFormats = void 0;
const child_process_1 = require("child_process");
const path_1 = __importDefault(require("path"));
exports.outputFormats = ["png", "svg", "eps"];
const streamPlantUml = async (pumlStream, outputStream, options = {}) => {
    const pumlJavaOptions = (0, exports.genPumlJavaOptions)(options);
    return pipePuml(pumlStream, outputStream, pumlJavaOptions);
};
exports.streamPlantUml = streamPlantUml;
const genPumlJavaOptions = (options = {}) => {
    const plantUmlOptions = [
        "-jar",
        path_1.default.join(__dirname, "./plantuml.jar"),
        "-Djava.awt.headless=true",
    ];
    if (options?.format) {
        if (!exports.outputFormats.includes(options.format)) {
            throw new Error(`Invalid format ${options.format}. Must be either: ${JSON.stringify(exports.outputFormats)}`);
        }
        plantUmlOptions.push("-t" + options.format);
    }
    if (options.limitSize) {
        plantUmlOptions.push("-DPLANTUML_LIMIT_SIZE=" + options.limitSize);
    }
    if (options.config) {
        plantUmlOptions.push("-config", options.config);
    }
    if (options.pipemap) {
        plantUmlOptions.push("-pipemap");
    }
    else {
        plantUmlOptions.push("-pipe");
    }
    return plantUmlOptions;
};
exports.genPumlJavaOptions = genPumlJavaOptions;
const pipePuml = (pumlStream, outputStream, plantUmlOptions) => {
    return new Promise(async (resolve, reject) => {
        const child = (0, child_process_1.spawn)("java", plantUmlOptions);
        pumlStream.pipe(child.stdin);
        child.stdout.pipe(outputStream);
        let error = "";
        for await (const chunk of child.stderr) {
            error += chunk;
        }
        child.once("exit", code => {
            if (code === 0) {
                resolve(code);
            }
            else {
                console.error(error);
                reject(new Error(`PlantUML process existed with status code ${code}. ${error}`));
            }
        });
        child.once("error", err => {
            reject(new Error(`PlantUML process failed with error: ${error}`, {
                cause: err,
            }));
        });
    });
};
//# sourceMappingURL=plantuml.js.map