# Token Details

tx2uml uses the [TokenDetails](./TokenInfo.sol) contract to get the following properties for a list of addresses:

-   Is it a contract?
-   Is the contract an NFT?
-   The `symbol` and `name` if they exist.
-   The `decimals` if it exists.
-   The primary ENS name if it exists.

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
} catch (err) {
    // handle error
}
```

## Ethereum Name Service

tx2uml uses [Ethereum Name Service (ENS)](https://ens.domains/)'s `ReverseRecords` contract to get the ENS name for an address. This is only available on Goerli and Mainnet.

See ENS's [Reverse records](https://github.com/ensdomains/reverse-records/#deployed-contract-address) repo for more information including the deployment addresses.

## TokenDetails Contract Deployments

[TokenDetails](./TokenInfo.sol) takes a constructor parameter `_reverseRecords` which is the address of Ethereum Name Service's `ReverseRecords` contract. This is only used on Goerli and Mainnet.

| Chain     | Address                                                                                                                               | \_reverseRecords                                                                                                             |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Mainnet   | [0xEf6B7d3885f4Af1bDfcB66FE0370D6012B38a8Db](https://etherscan.io/address/0xEf6B7d3885f4Af1bDfcB66FE0370D6012B38a8Db#code)            | [0x3671aE578E63FdF66ad4F3E12CC0c0d71Ac7510C](https://etherscan.io/address/0x3671aE578E63FdF66ad4F3E12CC0c0d71Ac7510C)        |
| Goerli    | [0x0395f995f2cecc40e2bf45d4905004313fcece6e](https://goerli.etherscan.io/address/0x0395f995f2cecc40e2bf45d4905004313fcece6e#code)     | [0x333Fc8f550043f239a2CF79aEd5e9cF4A20Eb41e](https://goerli.etherscan.io/address/0x333Fc8f550043f239a2CF79aEd5e9cF4A20Eb41e) |
| Sepolia   | [0xe147cb7d90b9253844130e2c4a7ef0ffb641c3ea](https://sepolia.etherscan.io/address/0xe147cb7d90b9253844130e2c4a7ef0ffb641c3ea#code)    | 0x0000000000000000000000000000000000000000                                                                                   |
| Polygon   | [0xf59659DB5f39F1f96D2DC1f32D3d16A45b8746Fa](https://polygonscan.com/address/0xf59659DB5f39F1f96D2DC1f32D3d16A45b8746Fa#code)         | 0x0000000000000000000000000000000000000000                                                                                   |
| Arbitrum  | [0x787ebd7a770fc07814adfd3a24f171d416371c2b](https://arbiscan.io/address/0x787ebd7a770fc07814adfd3a24f171d416371c2b#code)             | 0x0000000000000000000000000000000000000000                                                                                   |
| Optimism  | [0x8E2587265C68CD9EE3EcBf22DC229980b47CB960](https://optimistic.etherscan.io/address/0x8E2587265C68CD9EE3EcBf22DC229980b47CB960#code) | 0x0000000000000000000000000000000000000000                                                                                   |
| Avalanche | [0x4e557a2936D3a4Ec2cA4981e6cCCfE330C1634DF](https://snowtrace.io/address/0x4e557a2936D3a4Ec2cA4981e6cCCfE330C1634DF#code)            | 0x0000000000000000000000000000000000000000                                                                                   |
| Gnosis    | [0x04a05bE01C94d576B3eA3e824aF52668BAC606c0](https://gnosisscan.io/address/0x04a05be01c94d576b3ea3e824af52668bac606c0#code)           | 0x0000000000000000000000000000000000000000                                                                                   |
| Base      | [0x04a05bE01C94d576B3eA3e824aF52668BAC606c0](https://basescan.org/address/0x04a05bE01C94d576B3eA3e824aF52668BAC606c0)                 | 0x0000000000000000000000000000000000000000                                                                                   |
| BSC       |                                                                                                                                       | 0x0000000000000000000000000000000000000000                                                                                   |
| Crono     |                                                                                                                                       | 0x0000000000000000000000000000000000000000                                                                                   |
| Fantom    |                                                                                                                                       | 0x0000000000000000000000000000000000000000                                                                                   |
| Moonbeam  |                                                                                                                                       | 0x0000000000000000000000000000000000000000                                                                                   |
| Scroll    |                                                                                                                                       | 0x0000000000000000000000000000000000000000                                                                                   |
| Celo      |                                                                                                                                       | 0x0000000000000000000000000000000000000000                                                                                   |

Deployments can be done using [Remix](https://remix.ethereum.org/)
