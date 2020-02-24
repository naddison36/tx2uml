// @ts-ignore no @types/node-plantuml
import plantuml from "node-plantuml"
import { createWriteStream, writeFile } from "fs"
import VError from "verror"

const debug = require('debug')('tx2uml')

type OutputFormat = "png" | "svg" | "puml"

interface OutputOptions {
  filename?: string
  format?: OutputFormat
}

export const generateFile = async (plantUml: string, options: OutputOptions = {}) => {
  const filename = constructFilename(options.filename, options.format)
  if (options.format === "puml") {
    writeFile(filename, plantUml, err => {
      if (err) {
        throw new VError(err, `Failed to write plant UML file to ${filename} in raw puml format.`)
      } else {
        debug(`Plant UML file written to ${filename} in raw puml format`)
      }
    })
  } else if (options.format === "png" || options.format === "svg") {
    const generator = plantuml.generate(plantUml, {format: options.format}, (err: Error) => {
      if (err) {
        throw new VError(err, `Failed to write plant UML file to ${filename} in ${options.format} format`)
      } else {
        debug(`Plant UML file written to ${filename} in ${options.format} format.`)
      }
    });
    generator.out.pipe(createWriteStream(filename))
  } else {
    throw new Error(`Output format ${options.format} is not supported. Only puml, png or svg formats are supported`)
  }
}

const constructFilename = (filename: string, format: OutputFormat = "png") => {
  if (!filename || filename === "") {
    return `output.${format}`
  }
  const fileExtension = filename.slice(-4)
  if (["puml", ".png", ".svg"].includes(fileExtension)) {
    return filename
  }

  return filename + '.' + format
}
