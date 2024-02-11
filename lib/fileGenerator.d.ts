/// <reference types="node" />
import { Readable } from "stream";
import { OutputOptions } from "./types/tx2umlTypes";
export declare const generateFile: (pumlStream: Readable, options?: OutputOptions) => Promise<void>;
