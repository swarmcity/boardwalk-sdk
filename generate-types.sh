#!/bin/bash
mkdir tmp

cp ./boardwalk-contracts/out/MarketplaceList.sol/*.json ./tmp
cp ./boardwalk-contracts/out/MarketplaceFactory.sol/*json ./tmp
cp ./boardwalk-contracts/out/MintableERC20.sol/*json ./tmp

npx typechain ./tmp/*.json --target ethers-v5 --out-dir src/abi

rm -rf tmp
