
# Test contract call and value transfer diagrams.

###### Mainnet
export ARCHIVE_NODE_URL=https://api.archivenode.io/your-api-key/erigon

## NFT Chungo swaps using Blur with different participants with ENS names
tx2uml 0x720e126ea17f4e0b2fcf021e6c6b90b55c5283527cdf50d4c2eb3cdbc012dbfc -v -f svg
tx2uml call 0x720e126ea17f4e0b2fcf021e6c6b90b55c5283527cdf50d4c2eb3cdbc012dbfc -v -f png
tx2uml 0x720e126ea17f4e0b2fcf021e6c6b90b55c5283527cdf50d4c2eb3cdbc012dbfc -v -f puml
tx2uml value 0x720e126ea17f4e0b2fcf021e6c6b90b55c5283527cdf50d4c2eb3cdbc012dbfc -v
tx2uml value 0x720e126ea17f4e0b2fcf021e6c6b90b55c5283527cdf50d4c2eb3cdbc012dbfc -v -f png

# Simple Ether transfer
tx2uml call 0xf61e53f06564935e6be7b5f8d96b7c9092710c764306bb6182f1c0a9e99c3bad -v
tx2uml value 0xf61e53f06564935e6be7b5f8d96b7c9092710c764306bb6182f1c0a9e99c3bad -v
# simple Ether transfer with emoji ens name
tx2uml value 0x4ed0dd60431a618b336babd6699219216568b5580972bc6cc549d3073c6e97d8 -v

# Moonbirds with Blur Pool token that doesn't have a symbol
tx2uml value 0x0dc73f341aae83c1ed93e29b5ac5c658daeaad86c3db263cb4678fe7bedc7057 -v

##### Goerli
export ARCHIVE_NODE_URL=https://eth-goerli.g.alchemy.com/v2/rU87yfwzx4Xv0HSrZAENZO0Otr1x4hqo

# mint NFT but token name and symbol not showing for NFT 0x23d86f0bf4900978B191378B134519371Da52f75
# the contract isn't verified so hard to work out why
tx2uml value 0x169657e2a29b565f6dd421b7d5b1412b13cb5c9f3f65eeca56b0e7b1973b9600 -v --chain goerli --onlyToken
tx2uml value 0x31784cedcd0a9eea91fc7d5b4c9e3225397bd3fe7e73de16ce00b589830d8ea6 -v --chain goerli --onlyToken
# Has token transfer of ZEENUS and address 0x9d525E28Fe5830eE92d7Aa799c4D21590567B595 is registered to multiple ENS names
# game-pass.eth, tuktuk.eth, banksy.eth, spareparts.eth, ronin-kaizen.eth
tx2uml value 0xf8def0e7f806ed0189352584c847f9cee986915c880bf5208826550992955059 -v --chain goerli --onlyToken

## Failed ETH transfer as out of gas
tx2uml value 0x7852b24164839910a1076c14342844dad88635e1e4ee4718bd69ae382c88c588 -v --chain goerli --onlyToken

anvil --fork-block-number 8616111 --steps-tracing -f $ARCHIVE_NODE_URL
tx2uml copy 0xd44ea70656c70fe64d29783815b9d3eb3d3b8ef92fa213c59c996baafbe2ecc1
tx2uml 0xd44ea70656c70fe64d29783815b9d3eb3d3b8ef92fa213c59c996baafbe2ecc1 -v --chain goerli -n anvil --url http://localhost:8545
tx2uml value 0xd44ea70656c70fe64d29783815b9d3eb3d3b8ef92fa213c59c996baafbe2ecc1 -v --chain goerli --url http://localhost:8545

# Account Abstraction Stackup
anvil --fork-block-number 8633347 --steps-tracing -f $ARCHIVE_NODE_URL
tx2uml copy 0xc2ed857dd8396e4029c9f9d7a6f5c5eedad3210fd0bf2b3da4d8e29af06b6167
# this delegate calls
tx2uml call 0xc2ed857dd8396e4029c9f9d7a6f5c5eedad3210fd0bf2b3da4d8e29af06b6167 -v --chain goerli -n anvil --url http://localhost:8545
# no delegate calls
tx2uml call 0xc2ed857dd8396e4029c9f9d7a6f5c5eedad3210fd0bf2b3da4d8e29af06b6167 -v -x --chain goerli -n anvil --url http://localhost:8545

# Account Abstraction my contracts
anvil --fork-block-number 8645315 --steps-tracing -f $ARCHIVE_NODE_URL
# Deploy SimpleAccountFactory
tx2uml copy 0xdcf4f2b59ebe51cd09438f310c08e39f1358162b676cfb62b0c078127cfc82d6
tx2uml call 0xdcf4f2b59ebe51cd09438f310c08e39f1358162b676cfb62b0c078127cfc82d6 -v --chain goerli -n anvil --url http://localhost:8545
# Create Account with salt
anvil --fork-block-number 8646391 --steps-tracing -f $ARCHIVE_NODE_URL
tx2uml copy 0x62ed9f7f678b9bb8161876b69a874af855286d8d36e88cb6f9c2aa665bb58359
tx2uml call 0x62ed9f7f678b9bb8161876b69a874af855286d8d36e88cb6f9c2aa665bb58359 -v --chain goerli -n anvil --url http://localhost:8545

# Create Account with 0 salt
anvil --fork-block-number 8650302 --steps-tracing -f $ARCHIVE_NODE_URL
tx2uml copy 0xb9faada5808916e4bb0ccd9757bb5971698a089bf8ebe6fa73ef12e6b7d471e6
tx2uml call 0xb9faada5808916e4bb0ccd9757bb5971698a089bf8ebe6fa73ef12e6b7d471e6 -v --chain goerli -n anvil --url http://localhost:8545
# Send ETH from abstract account wallet to owner's signer account
anvil --fork-block-number 8651997 --steps-tracing -f $ARCHIVE_NODE_URL
tx2uml copy 0xec3076b33e04ff331e27bdf3188c50e3520d570580f794f253de1ed5298df9af
tx2uml call 0xec3076b33e04ff331e27bdf3188c50e3520d570580f794f253de1ed5298df9af -v --chain goerli -n anvil --url http://localhost:8545
# Send ETH from abstract account wallet to two different EOAs
anvil --fork-block-number 8661585 --steps-tracing -f $ARCHIVE_NODE_URL
tx2uml copy 0x3afa8fe219e83fb6cc30e5db6e9e6d2ea1e701ea338c3c47c9beb18c6b7e571a
tx2uml call 0x3afa8fe219e83fb6cc30e5db6e9e6d2ea1e701ea338c3c47c9beb18c6b7e571a -v --chain goerli -n anvil --url http://localhost:8545

###### Sepolia
#export ARCHIVE_NODE_URL=https://sepolia.infura.io/v3/your-api
# MiladyColaTest
tx2uml value 0x4a8461847c4684b82a9faad57f63004420ef4e3a5ffeaa5c93764cef4f00631b -v --chain sepolia --onlyToken
# Degen with ETH transfer if run against local Anvil fork

tx2uml value 0x01c0f0cad5eca60e24c26639e7867c6c59f7c28288242c68c0108ec615b22be4 -v --chain sepolia --onlyToken

anvil --fork-block-number 3044149 --steps-tracing -f $ARCHIVE_NODE_URL
tx2uml copy 0x01c0f0cad5eca60e24c26639e7867c6c59f7c28288242c68c0108ec615b22be4
tx2uml 0x01c0f0cad5eca60e24c26639e7867c6c59f7c28288242c68c0108ec615b22be4 -v --chain sepolia -n anvil --url http://localhost:8545

###### Polygon
export ARCHIVE_NODE_URL=https://polygon-mainnet.infura.io/v3/your-api

## mUSD swap on Polygon
tx2uml value 0xd96e4fa0b545652e99b35aee027246cb14739e27e7d74d92eb3875380f1e71ea -v --onlyToken --chain polygon

## BSC

tx2uml 0xfb153c572e304093023b4f9694ef39135b6ed5b2515453173e81ec02df2e2104 -v --chain bsc

##### Avalanche
export ARCHIVE_NODE_URL=https://api.avax.network/ext/bc/C/rpc
# Using an archive node
tx2uml call 0xb145f0f6838cd75b1d9086bc52577eefb14f18ac25f443fe60c55bcaff198dde -v --chain avalanche
## Unwrapping WETH.e
tx2uml value 0xb145f0f6838cd75b1d9086bc52577eefb14f18ac25f443fe60c55bcaff198dde -v --onlyToken --chain avalanche
# ParaSwap 393.94480757 BTC.b for 5,355.278278395507586356 WETH.e
tx2uml value 0x4004463020db2f6cc0a3c266a4a30327f01b97cbce55636991d26f207b01c14c -v --onlyToken --chain avalanche -f png
# Simple AVAX transfer
anvil --fork-block-number 27239142 --steps-tracing -f $ARCHIVE_NODE_URL
tx2uml copy 0x6686f964a8db99d6e4c8eb336c0b47365055f7ca54111339848f293cdbb225a6 -v
tx2uml call 0x6686f964a8db99d6e4c8eb336c0b47365055f7ca54111339848f293cdbb225a6 -v -n anvil --chain avalanche --url http://localhost:8545
# will not work as "non-default tracer not supported yet" in Anvil
#tx2uml value 0x6686f964a8db99d6e4c8eb336c0b47365055f7ca54111339848f293cdbb225a6 -v --chain avalanche --url http://localhost:8545

tx2uml call 0xb210b804f269b8ecbb799ef13a5c06636aa8b7690ecd6ef595c289be691794a4 -v -n anvil --url http://localhost:8545

#### Arbitrum
export ARCHIVE_NODE_URL=https://arb-mainnet.g.alchemy.com/v2/your-key
# read-only reentrancy attack
tx2uml value 0x5db5c2400ab56db697b3cc9aa02a05deab658e1438ce2f8692ca009cc45171dd -v --onlyToken --chain arbitrum
# Lemma Router
tx2uml value 0xb252ebbce1aead091c767463a242feb9e470d8d920a67f89c85449e676662584 -v --onlyToken --chain arbitrum
# 1Inch swap
tx2uml value 0x28650d09908542f6d1e08abeb476cb576d7daf72b0cef81aa24c142206b35f7c -v --onlyToken --chain arbitrum
# using QuickNode which supports custom tracers
tx2uml value 0x28650d09908542f6d1e08abeb476cb576d7daf72b0cef81aa24c142206b35f7c -v --chain arbitrum

### Base
tx2uml value -c base -v 0x83fa7d62d5790e62010ad93c91eeab146171a1f4fa54897a8e540ef29ab98f17
tx2uml value -c base -v 0x83fa7d62d5790e62010ad93c91eeab146171a1f4fa54897a8e540ef29ab98f17 -f png
tx2uml call -c base -v 0x83fa7d62d5790e62010ad93c91eeab146171a1f4fa54897a8e540ef29ab98f17
tx2uml call -c base -v -g -pv -l 0x83fa7d62d5790e62010ad93c91eeab146171a1f4fa54897a8e540ef29ab98f17
