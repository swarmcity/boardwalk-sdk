import { describe, expect, test, beforeEach, afterEach } from 'vitest'
import { Protocols } from 'js-waku'
import pDefer from 'p-defer'

// Utils
import { generateWallet, getProvider, getWsProvider } from '../utils/ethers'
import { pEvent } from '../utils/p-event'

// Services
import {
	ChainItem,
	createItem,
	subscribeToMarketplaceItems,
	subscribeToWakuItems,
	WakuItem,
} from '../../src/services/items'

// Utils
import { deployERC20, deployMarketplace, deployMarketplaceFactory } from '../utils/deploy'
import { cleanup, CleanUpFunction } from '../utils/cleanup'

// ABIs
import { Marketplace } from '../../src/abi'

// Lib
import { getWaku } from '../../src/lib/waku'
import { BigNumber } from 'ethers'

describe('items', async () => {
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

	test('item creation pushes a stored event to Waku', async () => {
		const waku = await getWaku([Protocols.LightPush, Protocols.Filter])
		let deferred = pDefer<WakuItem>()

		// Subscribe to Waku items
		const unsubscribe = await subscribeToWakuItems(waku, marketplace.address, deferred.resolve)
		cleanupFns.push(unsubscribe)

		// Create the item
		await createItem(waku, marketplace.address, { price: 123, description: 'Test item' }, user)

		// Expected item
		const expected = {
			hash: '0x2d1dd148d3aa0bebf9ba0ad804cabab7fe0c78a435c084e51fc460694d3a7115',
			metadata: {
				description: 'Test item',
			},
		}

		// Wait for the callback to resolve
		let item = await deferred.promise
		expect(item).toEqual(expected)

		// Re-run the query to fetch from the store
		deferred = pDefer<WakuItem>()
		await subscribeToWakuItems(
			waku,
			marketplace.address,
			deferred.resolve,
			undefined,
			undefined,
			false,
		)

		item = await deferred.promise
		expect(item).toEqual(expected)
	}, 15_000)

	test('subscribing to on-chain marketplace items works', async () => {
		const waku = await getWaku([Protocols.LightPush, Protocols.Filter])
		const done = pDefer<WakuItem>()
		const items = pEvent<Record<string, ChainItem[]>>()

		// Create item
		await createItem(waku, marketplace.address, { price: 123, description: 'Test item' }, user)
		await createItem(waku, marketplace.address, { price: 234, description: 'Toast item' }, user)

		// Subscribe to Waku items
		// NOTE: This subscription does not sync items added later on
		// NOTE: It only syncs item status and funding status
		// TODO: Test status and funding updates
		const unsubscribe = subscribeToMarketplaceItems(
			marketplace.address,
			getProvider(),
			getWsProvider(),
			items.listener,
			done.resolve,
		)
		cleanupFns.push(unsubscribe)

		// Should resolve immediately without any items
		await expect(done.promise).resolves
		await expect(items.next()).resolves.toMatchObject({
			'0x2d1dd148d3aa0bebf9ba0ad804cabab7fe0c78a435c084e51fc460694d3a7115': [
				{
					owner: user.address,
					id: BigNumber.from(1),
					metadata: '0x2d1dd148d3aa0bebf9ba0ad804cabab7fe0c78a435c084e51fc460694d3a7115',
					price: BigNumber.from(123).mul(BigNumber.from(10).pow(18)),
					fee: BigNumber.from(12345),
					seekerRep: BigNumber.from(0),
					status: 1,
					transactions: {},
				},
			],
			'0x82245f28312b3f14be70a166a96f3defb030d540d84aaaeda11e56ee9680a7ab': [
				{
					owner: user.address,
					id: BigNumber.from(2),
					metadata: '0x82245f28312b3f14be70a166a96f3defb030d540d84aaaeda11e56ee9680a7ab',
					price: BigNumber.from(234).mul(BigNumber.from(10).pow(18)),
					fee: BigNumber.from(12345),
					seekerRep: BigNumber.from(0),
					status: 1,
					transactions: {},
				},
			],
		})
	}, 30_000)
})
