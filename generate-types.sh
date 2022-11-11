#!/bin/bash
mkdir tmp

cp ./lib/boardwalk-contracts/out/MarketplaceList.sol/*.json ./tmp
cp ./lib/boardwalk-contracts/out/MarketplaceFactory.sol/*json ./tmp
cp ./lib/boardwalk-contracts/out/Marketplace.sol/*json ./tmp
cp ./lib/boardwalk-contracts/out/MintableERC20.sol/*json ./tmp

npx typechain ./tmp/*.json --target ethers-v5 --out-dir src/abi

rm -rf tmp
