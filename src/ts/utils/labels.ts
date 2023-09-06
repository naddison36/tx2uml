import { basename, join } from "path"
import { Labels, Network } from "../types/tx2umlTypes"
import fs from "fs"

const debug = require("debug")("tx2uml")

export const loadLabels = (network: Network): Labels => {
    const parentFolder = join(__dirname, `..`)
    debug(`Label __dirname ${__dirname}`)
    // Try and get Etherscan labels from local file
    const labelsFile =
        // get parent folder name of parent
        basename(parentFolder) === "ts"
            ? // running as ts-node
              join(parentFolder, `../../lib/labels/${network}.json`)
            : // running a node js
              join(parentFolder, `./labels/${network}.json`)

    if (fs.existsSync(labelsFile)) {
        debug(`Loading labels from ${labelsFile}`)
        return require(labelsFile)
    }
    debug(`Failed to load labels from ${labelsFile}`)
    return {}
}
