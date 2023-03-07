
# Script to execute the examples diagrams

# export ARCHIVE_NODE_URL=https://api.archivenode.io/your-api-key/erigon

# Contract Call Diagrams

# Uniswap V2 Swap
tx2uml 0x1fa132b63521e60f4debcfe2180aa90c771b803b7470c0db4c7913bcf207449b -v -o ./uniswapV2Swap

# Uniswap V1 Remove Liquidity with a delegatecall
tx2uml 0xe5e35ee13bb6326df4da89f17504a81923299d4986de06a019ca7856cbe76bca -v -o ./uniswapMKRRemove

## Uniswap V1 Factory
tx2uml 0xef0ef332690119a0174f26c3ce40edfd4e57d138bb5c95a081e3d66ee571e706 -v -o ./uniswapFactory

## Deploy STRAX contract
tx2uml 0x22bd02c8d934627a4b79e7fd66dba69492ddf1bbb7a86dd74fdaf7bb32f8ea24 -v -o ./deployContract

## Unknown function names
tx2uml 0x7aca0414c3c04e58c11ad6b7d13bbfe1c6d4500fbe402900da9abf6bb6f53a8d -v -o ./funcSelectors

## Failed Uniswap V2 transactions
tx2uml 0x0e73ca54a42413cfe6ff9451f74c7294859327e6a8572b29e6b8df140f9ffa97 -v -o ./failedTx

## Aragon MultiSig Wallet with Ether Values
tx2uml 0x44e34b97bccd7406f199ec18e61489baa6619e4093269e1df559735dd31b25bf -v -o ./aragonMultiSig

## Crypto Kitties
tx2uml 0x89a683d5eb5c894d2725a05b3a880aa228c9d2ef72d9cdbfe4bac5b8077db6c1 -v -o ./kitties

## Moloch DAO with noParams
tx2uml 0x1744b7b718fe5cd553fa0b83b10df26f5fe249c7f8dccd3c23aa97030e1df70e -v --noParams -o molochRageQuit

## 1inch Exchange failed internal call
tx2uml 0x34e4f8b86b5c3fe5a9e30e7cf75b242ed3e6e4eeea68cfaf3ca68ef1edb93ed1 -v -o 1inchFailedInternal

## Aave Flash Loan with noParams
tx2uml 0xa87905dacd83c7ffaba0828ae52ecc1723c036432e97ee6e0af6e528e039ba3a -v --noParams --noGas -o aaveFlashLoan

## mStable Swap with noDelegates
tx2uml 0x7210c306842d275044789b02ae64aff4513ed812682de7b1cbeb12a4a0dd07af -v --noDelegates --noLogDetails --noGas -o ./musd-v3-swap-noproxy
tx2uml 0x7210c306842d275044789b02ae64aff4513ed812682de7b1cbeb12a4a0dd07af -v --noLogDetails --noGas -o ./musd-v3-swap

## Vyper Contract Names - Curve minter mint
tx2uml 0x9e93a3ef8dbfd18f14253da66ef2451abe94330ecd98e1399245eb01751e5626 -v -o ./curve-minter-mint

## Maker DAO noTxDetails
tx2uml 0x4d953a8c531624e8336df5060239b7c0462b3d4d0cc5dcbb61af679ba81d161a -v --noTxDetails -o makerDao

## Balancer Swap
tx2uml 0xe624e1e21e22fd312936a97df0852f4289ca88ab8bfdb40b679d46b55c842605 -v -f svg -o balancerSwap

## WETH Deposit and Withdraw calls
tx2uml 0x883e76ca9590e6cf37138548f04b5c3317e0e8d62c44665d2083cbee70152bd1,0x13142a10fe690b3e4c10708a68037e795fb85e048d70ccf15c639efb339e2e43 -v -f svg -o ./wethDepositWithddraw

# Value transfers diagrams

## Remove MKR liquidity from Uniswap V1
tx2uml.ts value 0xe5e35ee13bb6326df4da89f17504a81923299d4986de06a019ca7856cbe76bca -v -o ./transfers/uniswapMKRRemove

## Uniswap V3 Swap
tx2uml value 0xafc8b33fd096bffaaec0c75f4fad0fc8815bc906761a44a8db72d8aea3c9fec6 -v -o ./transfers/uniswapV3swap

## WETH Deposit and Withdraw
tx2uml value 0x883e76ca9590e6cf37138548f04b5c3317e0e8d62c44665d2083cbee70152bd1,0x13142a10fe690b3e4c10708a68037e795fb85e048d70ccf15c639efb339e2e43 -v -o ./transfers/wethDepositWithddraw

## NFT Transfers
tx2uml value 0x720e126ea17f4e0b2fcf021e6c6b90b55c5283527cdf50d4c2eb3cdbc012dbfc -v -o ./transfers/blurChungo

## Mints
tx2uml value 0xc717e875d1a3e9b59e721537287f5aba6542c12604f65f0a1026f55644d191a4 -v -o ./transfers/metavaultUsdcDeposit

## Burns
tx2uml value 0x142536caeb5e6cd552ed6885a5efe2a44756a403140f5e8d84b60532ec05f4f8 -v -o ./transfers/metavaultSettle

# Polygon
# export ARCHIVE_NODE_URL=https://polygon-mainnet.infura.io/v3/your-api

## mUSD swap on Polygon
tx2uml value 0xd96e4fa0b545652e99b35aee027246cb14739e27e7d74d92eb3875380f1e71ea -v --onlyToken --chain polygon -o ./transfers/polygon-musd-swap

