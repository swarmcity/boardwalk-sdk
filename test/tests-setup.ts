import { execSync } from 'child_process'
import { JsonRpcProvider } from '@ethersproject/providers'
import { Contract, Wallet } from 'ethers'
import { writeFile } from 'fs/promises'
import {getERC20, getMarketplaceFactory, getMarketplaceList} from '../src/index'

const OUT_FILE = './test/test-addresses.json'
const PRIVATE_KEYS = [
    '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80',
    '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d',
    '0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a',
    '0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6',
    '0x47e179ec197488593b187f80a00eb0da91f1b9d0b13f8733639f19c30a34926a',
    '0x8b3a350cf5c34c9194ca85829a2df0ec3153be0318b5e2d3348e872092edffba',
    '0x92db14e403b83dfe3df233f83dfa3a0d7096f21ca9b0d6d6b8d88b2b4ec1564e',
    '0x4bbbf85ce3377467afe5d46f804f221813b2bb87f24d81f60f1fcdbf7cbf4356',
    '0xdbda1821b80551c9d65939329250298aa3472ba22feea921c0cf5d620ea67b97',
    '0x2a871d0798f97d79848a013d4936a73bf4cc922c825d33c1cf7073dff6d409c6'
]

const provider = new JsonRpcProvider('http://127.0.0.1:8545')
const deployer = new Wallet(PRIVATE_KEYS[0], provider)

const contracts_dir =  './boardwalk-contracts'

// ERC20 token
async function deployERC20(deployer: Wallet, decimals: number, name: string, symbol: string): Promise<Contract> {
    console.log(`${name} token: deploying`)
    const address = execSync(`cd ${contracts_dir} && forge create --mnemonic ./mnemonic MintableERC20 --constructor-args ${decimals} | grep 'Deployed to: ' | sed 's/Deployed to: //g'`, { encoding: 'utf-8' }).trim();
    console.log(`${name} token: deployed to ${address}`)
    const erc20 = getERC20(address, deployer)
    await erc20.init(name, symbol, deployer.address)
    console.log(`${name} token: initialized with ${name} ${symbol}`)
    return erc20
}

async function deployMarketplaceFactory(deployer: Wallet): Promise<Contract> {
    console.log(`MarketplaceFactory: deploying`)
    const address = execSync(`cd ${contracts_dir} && forge create --mnemonic ./mnemonic MarketplaceFactory | grep 'Deployed to: ' | sed 's/Deployed to: //g'`, { encoding: 'utf-8' }).trim();
    console.log(`MarketplaceFactory: deployed to ${address}`)
    const marketplaceFactory = getMarketplaceFactory(address, deployer)
    return marketplaceFactory
}

async function deployMarketplaceList(deployer: Wallet): Promise<Contract> {
    console.log(`MarketplaceList: deploying`)
    const address = execSync(`cd ${contracts_dir} && forge create --mnemonic ./mnemonic MarketplaceList | grep 'Deployed to: ' | sed 's/Deployed to: //g'`, { encoding: 'utf-8' }).trim();
    console.log(`MarketplaceList: deployed to ${address}`)
    const marketplaceList = getMarketplaceList(address, deployer)
    return marketplaceList
}

export default async function testsSetup(): Promise<void> {
    const erc20 = await deployERC20(deployer, 18, 'testDAI', 'tDAI')
    const marketplaceFactory = await deployMarketplaceFactory(deployer)
    const marketplaceList = await deployMarketplaceList(deployer)

    await writeFile(OUT_FILE, JSON.stringify({
        PRIVATE_KEYS,
        MARKETPLACE_TOKEN_ADDRESS: erc20.address,
        MARKETPLACE_FACTORY_ADDRESS: marketplaceFactory.address,
        MARKETPLACE_LIST_ADDRESS: marketplaceList.address
    }, null, 2))
}
