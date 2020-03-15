#! /usr/bin/env node

import {
  getContracts,
  getTransaction,
  getTransactions,
  TransactionInfo
} from "./transaction"
import { streamPlantUml } from "./plantUmlStreamer"
import { generateFile } from "./fileGenerator"
import { transactionHash } from "./regEx"

const debugControl = require("debug")
const debug = require("debug")("tx2uml")
const program = require("commander")

program
  .arguments("<txHash>")
  .usage(
    `<transaction hash or comma separated list of hashes> [options]

Ethereum transaction visualizer that generates a UML sequence diagram from transaction contract calls.

The transaction hashes have to be in hexadecimal format with a 0x prefix. If running for multiple transactions, the comma separated list of transaction hashes must not have white spaces. eg spaces or tags.`
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
  .option("-a, --alethioApiKey <key>", "Alethio API Key")
  .option("-p, --params", "show function params and return values", false)
  .option("-g, --gas", "show gas usages", false)
  .option("-e, --ether", "show Ether value", false)
  .option("-v, --verbose", "run with debugging statements", false)
  .parse(process.argv)

if (program.verbose) {
  debugControl.enable("tx2uml,axios")
  debug(`Enabled tx2uml debug`)
}

const tx2uml = async () => {
  const options = {
    alethioApiKey: program.alethioApiKey,
    network: program.network
  }

  let transactions: TransactionInfo | TransactionInfo[]
  if (program.args[0]?.match(transactionHash)) {
    transactions = await getTransaction(program.args[0], options)
  } else {
    try {
      const txHashes = program.args[0]?.split(",")
      transactions = await getTransactions(txHashes, options)
    } catch (err) {
      console.error(
        `Must pass a transaction hash or an array of hashes in hexadecimal format with a 0x prefix`
      )
      process.exit(1)
    }
  }

  const contracts = await getContracts(transactions, options)

  const pumlStream = streamPlantUml(transactions, contracts, {
    ...program
  })

  let filename = program.outputFileName
  if (!filename) {
    filename = program.args[0]?.match(transactionHash)
      ? program.args[0]
      : "output"
  }

  await generateFile(pumlStream, {
    format: program.outputFormat,
    filename
  })
}

tx2uml()
  .then(() => {
    debug("Done!")
  })
  .catch(err => {
    console.error(`Failed to generate UML diagram ${err.stack}`)
  })
