import { describe, expect, test, beforeEach } from 'vitest'
import { Protocols } from 'js-waku'

// Services
import { getWallet } from '../utils/ethers'

// Utils
import { deployERC20, deployMarketplace, deployMarketplaceFactory } from '../utils/deploy'

// ABIs
import { Marketplace } from '../../src/abi'

// Lib
import { getWaku } from '../../src/lib/waku'
import { createItem } from '../../src/services/items'

describe('create and retrieve profile picture', () => {
	const deployer = getWallet(0)
	const user = getWallet(1)

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

	test('item creation on-chain transaction succeeds', async () => {
		const waku = await getWaku([Protocols.LightPush, Protocols.Filter])
		const wallet = getWallet(1)

		const id = await createItem(
			waku,
			marketplace.address,
			{ price: 123, description: 'Test item' },
			wallet,
		)
		expect(id).toEqual(1n)
	})
})
