import { describe, expect, test, beforeEach, afterEach } from 'vitest'
import { randomBytes } from 'node:crypto'
import { arrayify } from 'ethers/lib/utils'

// Utils
import { generateWallet } from '../utils/ethers'
import { deployERC20, deployMarketplace, deployMarketplaceFactory } from '../utils/deploy'
import { cleanup, CleanUpFunction } from '../utils/cleanup'

// ABIs
import { Marketplace } from '../../src/abi'

// Services
import { cancelItem, fundItem, newItem, payoutItem } from '../../src/services/item'
import { createPermitProvider } from '../../src/services/select-provider'
import { getMarketplaceContract } from '../../src/services/marketplace'
import { Status } from '../../src/services/items'

// NOTE: Mostly tests the happy paths, as the failure
// conditions are already tested in the contracts.
describe('item', async () => {
	const deployer = await generateWallet()
	const seeker = await generateWallet()
	const provider = await generateWallet()

	let marketplace: Marketplace

	const createSignature = async (item: bigint) => {
		const { chainId } = await marketplace.provider.getNetwork()
		const { signature } = await createPermitProvider(
			{
				provider: provider.address,
				item,
				marketplace: {
					address: marketplace.address,
					name: 'Marketplace',
					chainId: BigInt(chainId),
				},
			},
			seeker,
		)

		return signature
	}

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

		// Mint 10k tokens to both users
		await erc20.mint(seeker.address, 10n ** 23n)
		await erc20.mint(provider.address, 10n ** 23n)
	})

	const cleanupFns: CleanUpFunction[] = []
	afterEach(cleanup.bind(null, cleanupFns))

	test('can create an item', async () => {
		const hash = '0x' + randomBytes(32).toString('hex')
		const { item } = await newItem(seeker, marketplace.address, 123456789n, arrayify(hash))
		const { timestamp } = await deployer.provider.getBlock('latest')

		expect(item).toEqual({
			id: 1n,
			owner: seeker.address,
			metadata: hash,
			price: 123456789n,
			fee: 12345n,
			seekerRep: 0n,
			timestamp: BigInt(timestamp),
		})
	})

	test('item id is correct', async () => {
		const hash = arrayify(randomBytes(32))

		for (let i = 0; i < 3; i++) {
			const { item } = await newItem(seeker, marketplace.address, 1n, hash)
			expect(item.id).toEqual(BigInt(i + 1))
		}
	})

	test('fund a deal', async () => {
		// Creatte the item
		const hash = arrayify(randomBytes(32))
		const { item } = await newItem(seeker, marketplace.address, 1n, hash)

		// Fund the item
		const signature = await createSignature(item.id)
		await fundItem(provider, marketplace.address, item.id, signature)

		// Check if the status changed
		const contract = getMarketplaceContract(marketplace.address, seeker.provider)
		const { status } = await contract.items(item.id)
		expect(status).toEqual(Status.Funded)
	})

	test('pay a deal out', async () => {
		// Creatte the item
		const hash = arrayify(randomBytes(32))
		const { item } = await newItem(seeker, marketplace.address, 1n, hash)

		// Fund the item
		const signature = await createSignature(item.id)
		await fundItem(provider, marketplace.address, item.id, signature)

		// Pay the deal out
		await payoutItem(seeker, marketplace.address, item.id)

		// Check if the status changed
		const contract = getMarketplaceContract(marketplace.address, marketplace.provider)
		const { status } = await contract.items(item.id)
		expect(status).toEqual(Status.Done)
	})

	test('cancel a deal', async () => {
		// Creatte the item
		const hash = arrayify(randomBytes(32))
		const { item } = await newItem(seeker, marketplace.address, 1n, hash)

		// Pay the deal out
		await cancelItem(seeker, marketplace.address, item.id)

		// Check if the status changed
		const contract = getMarketplaceContract(marketplace.address, marketplace.provider)
		const { status } = await contract.items(item.id)
		expect(status).toEqual(Status.Cancelled)
	})
})
