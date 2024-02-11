/// <reference types="node" />
import { Readable, Writable } from "stream";
import { PlantUmlOptions } from "./types/tx2umlTypes";
export declare const streamPlantUml: (pumlStream: Readable, outputStream: Writable, options: PlantUmlOptions) => Promise<number>;
export declare const genPumlJavaOptions: (options: PlantUmlOptions) => string[];
