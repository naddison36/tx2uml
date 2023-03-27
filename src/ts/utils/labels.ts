import { basename } from "path"
import { Labels, Network } from "../types/tx2umlTypes"
import fs from "fs"

export const loadLabels = (network: Network): Labels => {
    // Try and get Etherscan labels from local file
    const labelsFile =
        basename(__dirname) === "lib"
            ? `./${network}.json`
            : `../../lib/${network}.json`
    return fs.existsSync(labelsFile) ? require(labelsFile) : {}
}
