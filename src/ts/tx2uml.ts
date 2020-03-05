#! /usr/bin/env node

import { getTransaction } from "./transaction"
import { streamPlantUml } from "./plantUmlStreamer"
import { transactionHash } from "./regEx"
import { generateFile } from "./fileGenerator"

const debugControl = require("debug")
const debug = require("debug")("tx2uml")
const program = require("commander")

program
  .arguments("<txHash>")
  .usage(
    `<txHash> [options]

Ethereum transaction visualizer.
Generates a UML sequence diagram for a transaction's contract calls.`
  )
  .option(
    "-f, --outputFormat <value>",
    "output file format: png, svg or puml",
    "png"
  )
  .option("-o, --outputFileName <value>", "output file name")
  .option(
    "-n, --network <network>",
    "mainnet, ropsten, kovan or rinkeby",
    "mainnet"
  )
  .option("-e, --etherscanApiKey <key>", "Etherscan API Key")
  .option("-a, --alethioApiKey <key>", "Alethio API Key")
  .option("-p, --params", "show function params and return values", false)
  .option("-g, --gas", "show gas usages", false)
  // TODO change short of --ether to -e when Etherscan is removed
  .option("-t, --ether", "show Ether value", false)
  .option("-v, --verbose", "run with debugging statements", false)
  .parse(process.argv)

if (program.verbose) {
  debugControl.enable("tx2uml,axios")
  debug(`Enabled tx2uml debug`)
}

const tx2uml = async () => {
  if (!program.args[0]?.match(transactionHash)) {
    console.error(
      `Must pass a transaction hash in hexadecimal format with a 0x prefix`
    )
    process.exit(1)
  }
  const txHash = program.args[0]

  const [messages, contracts, details] = await getTransaction(txHash, {
    alethioApiKey: program.alethioApiKey,
    etherscanApiKey: program.etherscanApiKey,
    network: program.network
  })

  const pumlStream = streamPlantUml(messages, contracts, details, {
    ...program
  })

  await generateFile(pumlStream, {
    format: program.outputFormat,
    filename: program.outputFileName || txHash
  })
}

tx2uml()
  .then(() => {
    debug("Done!")
  })
  .catch(err => {
    console.error(`Failed to generate UML diagram ${err.stack}`)
  })
