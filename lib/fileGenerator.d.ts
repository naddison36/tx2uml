import { Readable } from "stream";
declare type OutputFormat = "png" | "svg" | "eps" | "puml";
interface OutputOptions {
    filename?: string;
    format?: OutputFormat;
}
export declare const generateFile: (pumlStream: Readable, options?: OutputOptions) => Promise<void>;
export {};
