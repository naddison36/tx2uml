# Token Details

tx2uml uses the [TokenDetails](./TokenInfo.sol) contract to get the following properties for a list of addresses:
* Is it a contract?
* Is the contract an NFT?
* The `symbol` and `name` if they exist.
* The `decimals` if it exists.
* The primary ENS name if it exists.

## Interface

### Solidity

tx2uml uses the [getInfoBatch](./TokenInfo.sol#L54) function which wraps the property calls in try/catch blocks so if one address fails the other token details will still be returned.

```Solidity
struct Info {
    string symbol;
    string name;
    uint256 decimals;
    bool noContract;
    bool nft;
    string ensName;
}

interface ITokenInfo {
    function getInfoBatch(address[] calldata tokens) external view returns (Info[] memory infos);

    function getInfo(address token) external view returns (Info memory info);

    function isContract(address account) external view returns (bool);

    function getEnsName(address account) external view returns (string memory ensName);
}
```

Other external functions like `getStringProperties`, `getBytes32Properties`, `getDecimals` and `isNFT` are not protected with a try/catch so will throw an error if the contract is not a token or NFT.

The full Solidity interface is [ITokenInfo.sol](./ITokenInfo.sol).

The Application Binary Interface (ABI) for the contract is [TokenInfoABI.json](./TokenInfoABI.json).

### TypeScript

tx2uml calls `getInfoBatch` on the `TokenDetails` contract using the [getTokenDetails](../ts/clients/EthereumNodeClient.ts#134) function on the [EthereumNodeClient](../ts/clients/EthereumNodeClient.ts) class.

```ts
const tokenInfo = new Contract(
    this.tokenInfoAddress,
    TokenInfoABI,
    this.ethersProvider
) as TokenInfo
try {
    const results = await tokenInfo.getInfoBatch(contractAddresses)
    debug(`Got token information for ${results.length} contracts`)
    return results.map((result, i) => ({
        address: contractAddresses[i],
        noContract: result.noContract,
        tokenSymbol: result.symbol,
        tokenName: result.name,
        decimals: result.decimals.toNumber(),
        ensName: result.ensName,
    }))
    // more code not included here
} catch(err) {
  // handle error
}
```

## Ethereum Name Service

tx2uml uses [Ethereum Name Service (ENS)](https://ens.domains/)'s `ReverseRecords` contract to get the ENS name for an address. This is only available on Goerli and Mainnet.

See ENS's [Reverse records](https://github.com/ensdomains/reverse-records/#deployed-contract-address) repo for more information including the deployment addresses.

## TokenDetails Contract Deployments

[TokenDetails](./TokenInfo.sol) takes a constructor parameter `_reverseRecords` which is the address of Ethereum Name Service's `ReverseRecords` contract. This is only used on Goerli and Mainnet. 

| Chain | Address | _reverseRecords |
| --- | --- | --- |
| Mainnet | [0x625b79e703eBC5156d8092ABC15741F8b2e7a70E](https://etherscan.io/address/0x625b79e703eBC5156d8092ABC15741F8b2e7a70E#code) | [0x3671aE578E63FdF66ad4F3E12CC0c0d71Ac7510C](https://etherscan.io/address/0x3671aE578E63FdF66ad4F3E12CC0c0d71Ac7510C) |
| Goerli | [0x796c008d8ADDCc33Da3e946Ca457432a35913c85](https://goerli.etherscan.io/address/0x796c008d8ADDCc33Da3e946Ca457432a35913c85#code) | [0x333Fc8f550043f239a2CF79aEd5e9cF4A20Eb41e](https://goerli.etherscan.io/address/0x333Fc8f550043f239a2CF79aEd5e9cF4A20Eb41e) |
| Sepolia | [0x796c008d8ADDCc33Da3e946Ca457432a35913c85](https://sepolia.etherscan.io/address/0x796c008d8ADDCc33Da3e946Ca457432a35913c85#code) | 0x0000000000000000000000000000000000000000 |
| Polygon | [0x8f17a4A27521972F7708696B7D563D270C008F24](https://polygonscan.com/address/0x8f17a4A27521972F7708696B7D563D270C008F24#code) | 0x0000000000000000000000000000000000000000 |
| Arbitrum | [0xe17ed31629488028110BeEBabC6E476ffA647bd9](https://arbiscan.io/address/0xe17ed31629488028110BeEBabC6E476ffA647bd9#code) | 0x0000000000000000000000000000000000000000 |
| Optimism | [0x149a692a94eEe18e7854CEA1CEaab557618D4D46](https://optimistic.etherscan.io/address/0x149a692a94eEe18e7854CEA1CEaab557618D4D46#code) | 0x0000000000000000000000000000000000000000 |
| Avalanche | [0x8ac84f0F6019E41A7e8255f0C32747cf8ADa2Ec3](https://snowtrace.io/address/0x8ac84f0f6019e41a7e8255f0c32747cf8ada2ec3#code) | 0x0000000000000000000000000000000000000000 |
| BSC |  | 0x0000000000000000000000000000000000000000 |
| Crono |  | 0x0000000000000000000000000000000000000000 |
| Fantom |  | 0x0000000000000000000000000000000000000000 |
| Moonbeam |  | 0x0000000000000000000000000000000000000000 |
| Gnosis |  | 0x0000000000000000000000000000000000000000 |
