import { JsonRpcProvider } from '@ethersproject/providers'
import { Wallet } from 'ethers'
import {getMarketplaceFactory, getERC20 } from '../src/index'
import { MARKETPLACE_FACTORY_ADDRESS, MARKETPLACE_TOKEN_ADDRESS, PRIVATE_KEYS } from './test-addresses.json'

const provider = new JsonRpcProvider('http://127.0.0.1:8545')
const marketplaceFactoryDeployer = new Wallet(PRIVATE_KEYS[0], provider)
const marketplaceFactory = getMarketplaceFactory(MARKETPLACE_FACTORY_ADDRESS, marketplaceFactoryDeployer)
const marketplaceToken = getERC20(MARKETPLACE_TOKEN_ADDRESS, marketplaceFactoryDeployer)

describe('MarketplaceToken', () => {
    test('is successfully deployed ', async () => {
        expect(await marketplaceToken.decimals()).toEqual(18)
        expect(await marketplaceToken.name()).toEqual('testDAI')
        expect(await marketplaceToken.symbol()).toEqual('tDAI')
    })
})

describe('MarketplaceFactory', () => {
    test('should create new marketplace ', async () => {
        expect(marketplaceFactory.address).toEqual(MARKETPLACE_FACTORY_ADDRESS)
    })
})