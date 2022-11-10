import { WebSocketProvider } from '@ethersproject/providers'
import { BigNumberish, Wallet } from 'ethers'
import {getMarketplaceFactory, getERC20, createMarketplace } from '../src/index'
import { MARKETPLACE_FACTORY_ADDRESS, MARKETPLACE_TOKEN_ADDRESS, PRIVATE_KEYS } from './test-addresses.json'
import { sleep } from './utils'

const provider = new WebSocketProvider('ws://127.0.0.1:8545')
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

interface EventData {
    marketplaceAddress: string
    marketplaceName: string
    providerRepAddress: string
    seekerRepAddress: string
}

describe('MarketplaceFactory', () => {
    test('should create new marketplace ', async () => {
        const marketplaceName = 'testmarketplace'
        const marketplaceFee = 0
        const marketplace = await createMarketplace(marketplaceFactory, marketplaceToken.address, marketplaceName, marketplaceFee, '')
        expect(marketplace.marketplace.address).toMatch(/0x[a-z0-9]{40}/i)
        expect(marketplace.providerRepToken.address).toMatch(/0x[a-z0-9]{40}/i)
        expect(marketplace.seekerRepToken.address).toMatch(/0x[a-z0-9]{40}/i)
    })
})