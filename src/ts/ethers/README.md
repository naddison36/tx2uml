## Modified Ethers.js serialization

tx2uml has modified [Ethers.js'](https://github.com/ethers-io/ethers.js) `serialize` function that converts a transaction object into a raw transaction string that can be sent to a node provider.

For EIP-1559 transaction, Ethers ensures the `gasPrice` matches the `maxFeePerGas`.
This is not something other wallets enforce so there are EIP-1559 transactions that have been mined where the `gasPrice` does not matche the `maxFeePerGas`.

tx2uml's `copy` command needs to be able to copy any mined transaction hence the Ethers serialization rules have been relaxed. 

The changes have been done to Ethers v5 transaction package https://github.com/ethers-io/ethers.js/blob/v5/packages/transactions/src.ts/index.ts
