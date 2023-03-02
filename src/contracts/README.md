# Token Details

tx2uml uses the [TokenDetails](./TokenInfo.sol) contract to get the following properties for a list of addresses:
* Is it a contract?
* Is the contract an NFT?
* The `symbol` and `name` if they exist.
* The `decimals` if it exists.

## Interface

tx2uml uses the [getInfoBatch](./TokenInfo.sol#L37) function which wraps the property calls in try/catch blocks so if one address fails the other token details will still be returned.

```Solidity
function getInfoBatch(address[] memory tokens)
external
view
returns (Info[] memory infos)
```

The `Info` structs returned in an array is

```Solidity
struct Info {
    string symbol;
    string name;
    uint256 decimals;
    bool noContract;
    bool nft;
}
```

tx2uml calls `getInfoBatch` on the `TokenDetails` contract using the [getTokenDetails](../ts/clients/EthereumNodeClient.ts#06) function on the [EthereumNodeClient](../ts/clients/EthereumNodeClient.ts) class.

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
    }))
    // more code not included here
} catch(err) {
  // handle error
}
```

## Deployments

| Chain | Address |
| --- | --- |
| Mainnet | [0x05b4671B2cC4858A7E72c2B24e202a87520cf14e](https://etherscan.io/address/0x05b4671b2cc4858a7e72c2b24e202a87520cf14e#code) | 
| Polygon | 0x |
| Arbitrum | 0x |
| Optimism | 0x |

