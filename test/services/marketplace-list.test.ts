import { describe, expect, test, beforeEach } from 'vitest'
import { Contract } from 'ethers'

// Services
import { getMarketplaceListContract, getMarketplaceList } from '../../src/services/marketplace-list'
import { awaitTx, getAddress, getProvider, getWallet } from '../utils/ethers'

// Utils
import { deployMarketplace, deployMarketplaceFactory, deployMarketplaceList } from '../utils/deploy'

describe('create and retrieve profile picture', () => {
	const deployer = getWallet(0)
	const gasLimit = 100_000

	let marketplaceFactoryContract: Contract
	let marketplaceListContract: Contract

	beforeEach(async () => {
		marketplaceFactoryContract = await deployMarketplaceFactory(deployer)
		marketplaceListContract = await deployMarketplaceList(deployer)
	})

	test('marketplace list contract is correct', async () => {
		const provider = getProvider()
		const { address } = marketplaceListContract
		const marketplace = getMarketplaceListContract(address, provider)

		expect(marketplace.address).toEqual(address)
		expect(marketplace.provider).toEqual(provider)
	})

	test('can fetch marketplaces', async () => {
		const provider = getProvider()
		const wallet = getWallet(0)

		const factory = marketplaceFactoryContract.address
		const marketplaceList = marketplaceListContract.address
		const marketplaceListAsOwner = getMarketplaceListContract(marketplaceList, wallet)

		// Deploy marketplaces
		const nonce = await wallet.getTransactionCount()
		const marketplaces = await Promise.all([
			deployMarketplace(factory, wallet, getAddress(12), 'Test 1', 46, '', { nonce }),
			deployMarketplace(factory, wallet, getAddress(45), 'Test 2', 12, '', { nonce: nonce + 1 }),
			deployMarketplace(factory, wallet, getAddress(78), 'Test 3', 79, '', { nonce: nonce + 2 }),
		])

		// Add a few marketplaces to the list
		await Promise.all(
			marketplaces.map(({ address }, index) =>
				awaitTx(marketplaceListAsOwner.add(address, { nonce: nonce + 3 + index })),
			),
		)

		// Fetch current list
		const list = await getMarketplaceList(provider, marketplaceList)
		expect(list.marketplaces).toMatchObject({
			[marketplaces[0].address]: {
				name: 'Test 1',
				address: marketplaces[0].address,
			},
			[marketplaces[1].address]: {
				name: 'Test 2',
				address: marketplaces[1].address,
			},
			[marketplaces[2].address]: {
				name: 'Test 3',
				address: marketplaces[2].address,
			},
		})
	}, 30_000)

	test('can remove marketplaces', async () => {
		const provider = getProvider()
		const wallet = getWallet(0)

		const factory = marketplaceFactoryContract.address
		const marketplaceList = marketplaceListContract.address
		const marketplaceListAsOwner = getMarketplaceListContract(marketplaceList, wallet)

		// Deploy marketplaces
		const nonce = await wallet.getTransactionCount()
		const marketplaces = await Promise.all([
			deployMarketplace(factory, wallet, getAddress(12), 'Test 1', 46, '', { nonce }),
			deployMarketplace(factory, wallet, getAddress(45), 'Test 2', 12, '', { nonce: nonce + 1 }),
			deployMarketplace(factory, wallet, getAddress(78), 'Test 3', 79, '', { nonce: nonce + 2 }),
		])

		// Add a few marketplaces to the list
		const promises = marketplaces.map(({ address }, index) =>
			awaitTx(marketplaceListAsOwner.add(address, { nonce: nonce + 3 + index })),
		)

		// Remove a marketplace
		promises.push(awaitTx(marketplaceListAsOwner.remove(2, { nonce: nonce + 6, gasLimit })))
		promises.push(awaitTx(marketplaceListAsOwner.remove(0, { nonce: nonce + 7, gasLimit })))
		await Promise.all(promises)

		// Fetch current list
		const list = await getMarketplaceList(provider, marketplaceList)
		expect(list.marketplaces).toMatchObject({
			[marketplaces[0].address]: {
				name: 'Test 1',
				address: marketplaces[0].address,
				deleted: true,
			},
			[marketplaces[1].address]: {
				name: 'Test 2',
				address: marketplaces[1].address,
			},
			[marketplaces[2].address]: {
				name: 'Test 3',
				address: marketplaces[2].address,
				deleted: true,
			},
		})
	}, 30_000)

	test('can remove a marketplace and add it back again', async () => {
		const provider = getProvider()
		const wallet = getWallet(0)

		const factory = marketplaceFactoryContract.address
		const marketplaceList = marketplaceListContract.address
		const marketplaceListAsOwner = getMarketplaceListContract(marketplaceList, wallet)

		// Deploy marketplaces
		const nonce = await wallet.getTransactionCount()
		const marketplaces = await Promise.all([
			deployMarketplace(factory, wallet, getAddress(12), 'Test 1', 46, '', { nonce }),
			deployMarketplace(factory, wallet, getAddress(45), 'Test 2', 12, '', { nonce: nonce + 1 }),
		])

		// Add a few marketplaces to the list
		const promises = marketplaces.map(({ address }, index) =>
			awaitTx(marketplaceListAsOwner.add(address, { nonce: nonce + 2 + index })),
		)

		// Remove a marketplace
		promises.push(awaitTx(marketplaceListAsOwner.remove(0, { nonce: nonce + 4, gasLimit })))

		// Re-add the marketplace
		promises.push(
			awaitTx(marketplaceListAsOwner.add(marketplaces[0].address, { nonce: nonce + 5, gasLimit })),
		)
		await Promise.all(promises)

		// Fetch current list
		const list = await getMarketplaceList(provider, marketplaceList)
		expect(list.marketplaces).toMatchObject({
			[marketplaces[0].address]: {
				name: 'Test 1',
				address: marketplaces[0].address,
			},
			[marketplaces[1].address]: {
				name: 'Test 2',
				address: marketplaces[1].address,
			},
		})
	}, 30_000)
})
