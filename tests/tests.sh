
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

# Moonbirds with BLur Pool token that doesn't have a symbol
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

tx2uml 0xfb153c572e304093023b4f9694ef39135b6ed5b2515453173e81ec02df2e2104 -v -onlyToken --chain bsc
