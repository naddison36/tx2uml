declare type OutputFormat = "png" | "svg" | "puml";
interface OutputOptions {
    filename?: string;
    format?: OutputFormat;
}
export declare const generateFile: (plantUml: string, options?: OutputOptions) => Promise<void>;
export {};
