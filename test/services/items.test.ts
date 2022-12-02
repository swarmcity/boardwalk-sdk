import { describe, expect, test, beforeEach, afterEach } from 'vitest'
import { Protocols } from 'js-waku'
import pDefer from 'p-defer'

// Utils
import { generateWallet } from '../utils/ethers'

// Services
import { createItem, subscribeToWakuItems, WakuItem } from '../../src/services/items'

// Utils
import { deployERC20, deployMarketplace, deployMarketplaceFactory } from '../utils/deploy'
import { cleanup, CleanUpFunction } from '../utils/cleanup'

// ABIs
import { Marketplace } from '../../src/abi'

// Lib
import { getWaku } from '../../src/lib/waku'

describe('create and retrieve profile picture', async () => {
	const deployer = await generateWallet()
	const user = await generateWallet()

	let marketplace: Marketplace

	beforeEach(async () => {
		// Create a marketplace
		const erc20 = await deployERC20(deployer, 18, 'Fake DAI', 'FDAI')
		const factory = await deployMarketplaceFactory(deployer)
		marketplace = await deployMarketplace(
			factory.address,
			deployer,
			erc20.address,
			'Marketplace',
			12345,
			'',
		)

		// Mint 10k tokens to the user
		await erc20.mint(user.address, 10n ** 23n)
	})

	const cleanupFns: CleanUpFunction[] = []
	afterEach(cleanup.bind(null, cleanupFns))

	test('item creation on-chain transaction succeeds', async () => {
		const waku = await getWaku([Protocols.LightPush, Protocols.Filter])
		const id = await createItem(
			waku,
			marketplace.address,
			{ price: 123, description: 'Test item' },
			user,
		)
		expect(id).toEqual(1n)
	}, 10_000)

	test('item creation pushes an event to Waku', async () => {
		const waku = await getWaku([Protocols.LightPush, Protocols.Filter])
		const deferred = pDefer<WakuItem>()

		// Subscribe to Waku items
		const unsubscribe = await subscribeToWakuItems(waku, marketplace.address, deferred.resolve)
		cleanupFns.push(unsubscribe)

		// Create the item
		await createItem(waku, marketplace.address, { price: 123, description: 'Test item' }, user)

		// Wait for the callback to resolve
		const item = await deferred.promise
		expect(item).toEqual({
			hash: '0x2d1dd148d3aa0bebf9ba0ad804cabab7fe0c78a435c084e51fc460694d3a7115',
			metadata: {
				description: 'Test item',
			},
		})
	})
})
