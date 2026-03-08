# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## About

`tx2uml` is an Ethereum transaction visualizer that generates UML sequence diagrams. It fetches transaction traces from an Ethereum archive node and contract ABIs from Etherscan, then produces PlantUML diagrams rendered via a bundled `plantuml.jar`.

## Commands

```bash
# Build TypeScript to lib/
npm run build

# Clean build artifacts
npm run clean

# Run all tests
npm test

# Run a single test file
npx jest src/ts/__tests__/plantuml.test.ts

# Format code
npm run prettier:fix

# Check formatting
npm run prettier:check

# Generate example diagrams (requires Java)
npm run examples

# Full pre-publish sequence
npm run clean && npm run package-lock && npm run build && npm run permit
```

TypeScript source lives in `src/ts/`, compiled output goes to `lib/`. The CLI entry point is `lib/tx2uml.js` (compiled from `src/ts/tx2uml.ts`).

Tests are in `__tests__` subdirectories alongside source files and matched by `/__tests__/.*\.test\.ts$`. Tests use `ts-jest` so they run directly against TypeScript.

## Architecture

The tool has three CLI commands — `call`, `value`, and `copy` — each with a corresponding orchestration module:

| Command | Orchestrator          | Description                         |
| ------- | --------------------- | ----------------------------------- |
| `call`  | `callDiagram.ts`      | Contract call sequence diagrams     |
| `value` | `valueDiagram.ts`     | Token/ETH value transfer diagrams   |
| `copy`  | `copyTransactions.ts` | Replay transactions to another node |

### Data flow for `call` command

1. **Node client** (`clients/GethClient.ts` or `clients/OpenEthereumClient.ts`) fetches transaction details and traces from the archive node via JSON-RPC (`debug_traceTransaction` for Geth/Erigon, `trace_transaction` for OpenEthereum/Nethermind/Besu/Anvil).
2. **`TransactionManager`** (`transaction.ts`) orchestrates fetching: traces, contract metadata from Etherscan, config file overrides, ABI decoding, and label loading.
3. **`EtherscanClient`** (`clients/EtherscanClient.ts`) calls Etherscan V2 API to get contract source and ABI. Uses `setChainId()` from `tx2umlTypes.ts` to map network names to chain IDs.
4. **`tracesPumlStreamer.ts`** converts the enriched trace tree into a PlantUML `Readable` stream.
5. **`fileGenerator.ts`** pipes the PlantUML stream into the bundled `plantuml.jar` Java process and writes the output file.

The `value` command follows the same pattern but uses `transfersPumlStreamer.ts` and parses ERC-20/721/1155 transfer events plus ETH transfers from a custom EVM tracer.

### Node clients

`EthereumNodeClient` (abstract base in `clients/EthereumNodeClient.ts`) defines the interface. It also holds a `TokenInfo` contract instance used to batch-fetch token metadata on supported chains. Two concrete implementations:

- **`GethClient`** — uses `debug_traceTransaction` with `callTracer`
- **`OpenEthereumClient`** — uses `trace_transaction`

### Key types (`types/tx2umlTypes.ts`)

- `Trace` — a node in the call tree with parent/child links
- `Contract` / `Contracts` — on-chain contract metadata keyed by address
- `Participant` / `Participants` — similar but for value transfer diagrams
- `TransactionDetails` — full tx data including logs
- `CallDiagramOptions` / `TransferPumlGenerationOptions` — option bags passed through the call stack
- `networks` / `nodeTypes` / `outputFormats` — string literal arrays used for CLI validation

### Configuration override (`config.ts`)

Users can supply a `tx.config.json` file to override contract names, protocols, token symbols, and ABIs for addresses not verified on Etherscan. The schema is in `config.schema.json`.

### Labels

Per-chain label JSON files live in `lib/labels/` (e.g. `mainnet.json`, `arbitrum.json`). These are sourced from the `etherscan-labels` GitHub repository and loaded by `utils/labels.ts`.

## Environment variables

| Variable            | CLI flag | Purpose                                          |
| ------------------- | -------- | ------------------------------------------------ |
| `ARCHIVE_NODE_URL`  | `-u`     | Archive node RPC URL                             |
| `ARCHIVE_NODE_TYPE` | `-n`     | Node type (`geth`, `erigon`, etc.)               |
| `ETH_NETWORK`       | `-c`     | Network name or chain ID                         |
| `EXPLORER_URL`      | `-e`     | Custom block explorer URL                        |
| `EXPLORER_API_KEY`  | `-k`     | Etherscan API key (required unless `chain=none`) |

## PlantUML and Java

`lib/plantuml.jar` is currently version **1.2024.8**, which is the latest release compatible with **Java 8**. PlantUML 1.2025.0 and above require Java 11+. Do not upgrade the jar beyond 1.2024.8 unless the Java requirement is also updated in the README.

## Adding a new network

1. Add the network name to the `networks` array in `src/ts/types/tx2umlTypes.ts`
2. Add its chain ID in `setChainId()`
3. Add its native currency in `setNetworkCurrency()` if not ETH
4. Optionally deploy the `TokenInfo` contract and add its address to `tokenInfoAddresses` in `EthereumNodeClient.ts`
5. Add a label file to `lib/labels/` and register it in `utils/labels.ts`
