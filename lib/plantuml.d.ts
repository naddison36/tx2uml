/// <reference types="node" />
import { Readable, Writable } from "stream";
export declare const outputFormats: readonly ["png", "svg", "eps"];
export declare type OutputFormat = typeof outputFormats[number];
export interface PlantUmlOptions {
    format?: OutputFormat;
    limitSize?: number;
    config?: string;
    pipemap?: boolean;
}
export declare const streamPlantUml: (pumlStream: Readable, outputStream: Writable, options?: PlantUmlOptions) => Promise<number>;
export declare const genPumlJavaOptions: (options?: PlantUmlOptions) => string[];
