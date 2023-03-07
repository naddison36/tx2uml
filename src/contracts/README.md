# Token Details

tx2uml uses the [TokenDetails](./TokenInfo.sol) contract to get the following properties for a list of addresses:
* Is it a contract?
* Is the contract an NFT?
* The `symbol` and `name` if they exist.
* The `decimals` if it exists.
* The ENS name if it exists.

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

| Chain | Address | ENS |
| --- | --- | --- |
| Mainnet | [0x0ea78daff41c6d648045e5e9b0925ceda679719a](https://etherscan.io/address/0x0ea78daff41c6d648045e5e9b0925ceda679719a#code) | Yes |
| Goerli | [0x466D9AbFf7c91f170b4906Ddb4A75f50B4a16faD](https://goerli.etherscan.io/address/0x466D9AbFf7c91f170b4906Ddb4A75f50B4a16faD#code) | Yes |
| Sepolia | [0x8E2587265C68CD9EE3EcBf22DC229980b47CB960](https://sepolia.etherscan.io/address/0x8E2587265C68CD9EE3EcBf22DC229980b47CB960#code) | No |
| Polygon | [0x92aFa83874AA86c7f71F293F8A097ca7fE0ff003](https://polygonscan.com/address/0x92aFa83874AA86c7f71F293F8A097ca7fE0ff003#code) | No |
| Optimism | [0x149a692a94eEe18e7854CEA1CEaab557618D4D46](https://optimistic.etherscan.io/address/0x149a692a94eEe18e7854CEA1CEaab557618D4D46#code) | No |
| Arbitrum | [0x43B3BCe874EC872EFbCC784c1e3CD03005E529a9](https://arbiscan.io/address/0x43B3BCe874EC872EFbCC784c1e3CD03005E529a9#code) | No |

