import { describe, test, beforeEach, afterEach, expect } from 'vitest'
import { BigNumber, constants } from 'ethers'
import { splitSignature } from 'ethers/lib/utils'
import { sha256 } from '@ethersproject/sha2'

// Utils
import { generateWallet, getProvider, getWsProvider } from '../utils/ethers'

// Utils
import { deployERC20, deployMarketplace, deployMarketplaceFactory } from '../utils/deploy'
import { cleanup, CleanUpFunction } from '../utils/cleanup'
import { pEvent } from '../utils/p-event'

// ABIs
import { Marketplace, MintableERC20 } from '../../src/abi'
import {
	getMarketplaceConfig,
	getMarketplaceContract,
	getMarketplaceItem,
	getMarketplaceTokenContract,
	getMarketplaceTokenDecimals,
	MarketplaceItem,
} from '../../src/services/marketplace'
import { Status } from '../../src/services/items'
import { createPermitProvider } from '../../src/services/select-provider'

describe('create and retrieve profile picture', async () => {
	const deployer = await generateWallet()
	const seeker = await generateWallet()
	const user = await generateWallet()

	const provider = getProvider()
	const wsProvider = getWsProvider()

	let erc20: MintableERC20
	let marketplace: Marketplace

	beforeEach(async () => {
		// Create marketplace
		const factory = await deployMarketplaceFactory(deployer)
		erc20 = await deployERC20(deployer, 13, 'Fake DAI', 'FDAI')
		marketplace = await deployMarketplace(
			factory.address,
			deployer,
			erc20.address,
			'Marketplace',
			12345,
			'Hash',
		)
	})

	const cleanupFns: CleanUpFunction[] = []
	afterEach(cleanup.bind(null, cleanupFns))

	test('marketplace contract instance', async () => {
		const contract = getMarketplaceContract(marketplace.address, deployer)

		expect(contract.address).to.equal(marketplace.address)
		expect(contract.signer).to.equal(deployer)
		expect(contract.provider).to.equal(deployer.provider)
	})

	test('basic initial marketplace config', async () => {
		const config = await getMarketplaceConfig(
			marketplace.address,
			[
				'name',
				'fee',
				'token',
				'providerRep',
				'seekerRep',
				'payoutAddress',
				'metadataHash',
				'itemId',
			],
			provider,
		)

		expect(config).toMatchObject({
			name: 'Marketplace',
			fee: BigNumber.from(12345),
			token: erc20.address,
			payoutAddress: deployer.address,
			metadataHash: 'Hash',
			itemId: BigNumber.from(1),
		})
	})

	test('marketplace token contract instance', async () => {
		const contract = await getMarketplaceTokenContract(marketplace.address, deployer)

		expect(contract.address).to.equal(erc20.address)
		expect(contract.signer).to.equal(deployer)
		expect(contract.provider).to.equal(deployer.provider)
	})

	test('marketplace token decimals', async () => {
		const decimals = await getMarketplaceTokenDecimals(marketplace.address, provider)
		expect(decimals).to.equal(13)
	})

	test('inexistant marketplace item', async () => {
		const first = getMarketplaceItem(marketplace.address, 1n, wsProvider)
		await expect(first).rejects.toThrow(new Error('item not found'))

		const second = getMarketplaceItem(marketplace.address, 1n, wsProvider)
		await expect(second).rejects.toThrow(new Error('item not found'))
	})

	test('marketplace item', async () => {
		const contract = getMarketplaceContract(marketplace.address, seeker)
		const hash = sha256('0xdeadbeef')

		// Create item
		await erc20.mint(seeker.address, 100_000)
		await erc20.connect(seeker).approve(contract.address, 95_184)
		await contract.newItem(89012, hash)

		// Check item
		const { item } = await getMarketplaceItem(marketplace.address, 1n, wsProvider)
		expect(item).toEqual({
			fee: 12345n,
			metadata: hash,
			price: 89012n,
			providerAddress: constants.AddressZero,
			providerRep: 0n,
			seekerAddress: seeker.address,
			seekerRep: 0n,
			status: Status.Open,
		})
	})

	test('marketplace item subscription', async () => {
		const contract = getMarketplaceContract(marketplace.address, seeker)
		const hash = sha256('0xdeadbeef')

		// Create item
		await erc20.mint(seeker.address, 100_000)
		await erc20.connect(seeker).approve(contract.address, 95_184)
		await contract.newItem(89012, hash)

		// Subscribe to changes
		const callback = pEvent<MarketplaceItem>()
		const { item, unsubscribe } = await getMarketplaceItem(
			marketplace.address,
			1n,
			wsProvider,
			callback.listener,
		)
		cleanupFns.push(unsubscribe)

		// Expected
		const expected = {
			fee: 12345n,
			metadata: hash,
			price: 89012n,
			providerAddress: constants.AddressZero,
			providerRep: 0n,
			seekerAddress: seeker.address,
			seekerRep: 0n,
			status: Status.Open,
		}
		expect(item).toEqual(expected)

		// Fund the item
		const { signature } = await createPermitProvider(
			{
				provider: user.address,
				item: 1n,
				marketplace: {
					address: marketplace.address,
					name: 'Marketplace',
					chainId: BigInt(provider.network.chainId),
				},
			},
			seeker,
		)
		const { v, r, s } = splitSignature(signature)

		await erc20.mint(user.address, 100_000)
		await erc20.connect(user).approve(contract.address, 95_184)
		await contract.connect(user).fundItem(1n, v, r, s)

		// Skip one event (funding + status change)
		await callback.next()

		// Expect funding event
		expected.status = Status.Funded
		expected.providerAddress = user.address
		expect(await callback.next()).toEqual(expected)

		// Status change
		await contract.payoutItem(1n)
		expected.status = Status.Done
		expect(await callback.next()).toEqual(expected)
	})
})
