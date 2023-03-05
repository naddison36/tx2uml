import { spawn } from "child_process"
import path from "path"
import { Readable, Writable } from "stream"
import { PlantUmlOptions } from "./types/tx2umlTypes"

const debug = require("debug")("tx2uml")

export const streamPlantUml = async (
    pumlStream: Readable,
    outputStream: Writable,
    options: PlantUmlOptions
): Promise<number> => {
    const pumlJavaOptions = genPumlJavaOptions(options)

    return pipePuml(pumlStream, outputStream, pumlJavaOptions)
}

export const genPumlJavaOptions = (options: PlantUmlOptions): string[] => {
    const plantUmlOptions: string[] = options.memory
        ? [`-Xmx${options.memory}g`]
        : []
    plantUmlOptions.push(
        "-jar",
        path.join(__dirname, "./plantuml.jar"),
        "-Djava.awt.headless=true",
        "-DPLANTUML_LIMIT_SIZE=64000",
        "-pipe"
    )
    if (options?.format) {
        plantUmlOptions.push("-t" + options.format)
    }
    if (options.config) {
        plantUmlOptions.push("-config", options.config)
    }
    debug("PlantUML Java process options " + plantUmlOptions)

    return plantUmlOptions
}

const pipePuml = (
    pumlStream: Readable,
    outputStream: Writable,
    plantUmlOptions: string[]
): Promise<number> => {
    return new Promise<number>(async (resolve, reject) => {
        const child = spawn("java", plantUmlOptions, { detached: true })
        pumlStream.pipe(child.stdin)
        child.stdout.pipe(outputStream)

        let error = ""
        for await (const chunk of child.stderr) {
            error += chunk
        }

        child.once("exit", code => {
            if (code === 0) {
                resolve(code)
            } else {
                console.error(error)
                reject(
                    new Error(
                        `PlantUML process existed with status code ${code}. ${error}`
                    )
                )
            }
        })
        child.once("error", err => {
            reject(
                new Error(`PlantUML process failed with error: ${error}`, {
                    cause: err,
                })
            )
        })
    })
}
