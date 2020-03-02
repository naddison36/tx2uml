import { createWriteStream, writeFile } from "fs"
import VError from "verror"
import { Readable } from "stream"
import { outputFormats, streamPlantUml } from "./plantuml"

const debug = require("debug")("tx2uml")

type OutputFormat = "png" | "svg" | "eps" | "puml"

interface OutputOptions {
  filename?: string
  format?: OutputFormat
}

export const generateFile = async (
  pumlStream: Readable,
  options: OutputOptions = {}
) => {
  const filename = constructFilename(options.filename, options.format)
  if (options.format === "puml") {
    writeFile(filename, pumlStream, err => {
      if (err) {
        throw new VError(
          err,
          `Failed to write plant UML file to ${filename} in raw puml format.`
        )
      } else {
        debug(`Plant UML file written to ${filename} in raw puml format`)
      }
    })
  } else if (outputFormats.includes(options.format)) {
    const outputStream = createWriteStream(filename)
    await streamPlantUml(pumlStream, outputStream, {
      format: options.format,
      limitSize: 60000
    })
    debug(`Plant UML file written to ${filename} in ${options.format} format.`)
  } else {
    throw new Error(
      `Output format ${options.format} is not supported. Only the following formats are supported: ${outputFormats}.`
    )
  }
}

const constructFilename = (filename: string, format: OutputFormat = "png") => {
  if (!filename || filename === "") {
    return `output.${format}`
  }
  const fileExtension = filename.slice(-4)
  if (["puml", ...outputFormats].includes(fileExtension)) {
    return filename
  }

  return filename + "." + format
}
