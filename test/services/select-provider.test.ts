import { afterEach, describe, expect, test } from 'vitest'
import { constants } from 'ethers'
import { randomBytes } from 'node:crypto'
import { arrayify } from 'ethers/lib/utils'
import pDefer from 'p-defer'

// Services
import {
	createSelectProvider,
	formatPermitProviderEIP712Config,
	getSelectProvider,
	getSelectProviderTopic,
	SelectProviderResult,
	subscribeToSelectProvider,
} from '../../src/services/select-provider'

// Lib
import { getWaku, subscribeCombineCallback } from '../../src/lib/waku'

// Utils
import { generateWallet } from '../utils/ethers'
import { generateKeyPair, randomBigInt } from '../utils/crypto'
import { pEvent } from '../utils/p-event'
import { cleanup, CleanUpFunction } from '../utils/cleanup'

// NOTE: `createPermitProvider` tested in `marketplace.test.ts`
describe('select-provider', async () => {
	const waku = await getWaku()
	const provider = await generateWallet()
	const seeker = await generateWallet()

	const cleanupFns: CleanUpFunction[] = []
	afterEach(cleanup.bind(null, cleanupFns))

	test('content topic', async () => {
		expect(getSelectProviderTopic(constants.AddressZero, 42n)).to.equal(
			'/swarmcity/1/marketplace-0x0000000000000000000000000000000000000000-item-42-select-provider/proto',
		)
		expect(getSelectProviderTopic('0x00000000219ab540356cbb839cbe05303d7705fa', 1337n)).to.equal(
			'/swarmcity/1/marketplace-0x00000000219ab540356cBB839Cbe05303d7705Fa-item-1337-select-provider/proto',
		)
	})

	test('format EIP-712 permit', async () => {
		const config = formatPermitProviderEIP712Config({
			address: '0x00000000219ab540356cbb839cbe05303d7705fa',
			name: 'Marketplace',
			chainId: 1337n,
		})
		expect(config).toEqual({
			domain: {
				version: '1',
				name: 'Marketplace',
				chainId: 1337n,
				verifyingContract: '0x00000000219ab540356cbb839cbe05303d7705fa',
			},
			types: {
				PermitProvider: [
					{ name: 'seeker', type: 'address' },
					{ name: 'provider', type: 'address' },
					{ name: 'item', type: 'uint256' },
				],
			},
		})
	})

	test('select provider', async () => {
		// Random arguments (to avoid clashing with previous test runs)
		const address = '0x' + randomBytes(20).toString('hex')
		const item = randomBigInt()

		// Subscribe to events
		const done = pDefer()
		const callback = pEvent<SelectProviderResult | undefined>()
		const combine = subscribeCombineCallback(callback.listener)
		const result = await subscribeToSelectProvider(waku, address, item, combine, done.resolve)
		await result?.unsubscribe.then((fn) => cleanupFns.push(fn))

		// The store query is done and not results are available
		expect(await done.promise).toEqual(undefined)

		// Key exchange
		const sigPubKey = generateKeyPair().publicKey
		const ecdhPubKey = generateKeyPair().publicKey

		// Create select provider message
		await createSelectProvider(
			waku,
			seeker,
			{
				marketplace: {
					address,
					chainId: 1337n,
					name: 'Marketplace',
				},
				provider: provider.address,
				item,
			},
			{ sigPubKey, ecdhPubKey },
		)

		// Expected result
		const expected = {
			permitProvider: {
				marketplace: {
					address: arrayify(address),
					name: 'Marketplace',
					chainId: 1337n,
				},
				seeker: arrayify(seeker.address),
				provider: arrayify(provider.address),
				item,
			},
			keyExchange: {
				sigPubKey,
				ecdhPubKey,
			},
		}

		// Except an update on the event
		let selectProvider = await callback.next()
		expect(selectProvider?.data).toMatchObject(expected)

		// Expect the store query to be identical to the event
		selectProvider = await getSelectProvider(waku, address, item)
		expect(selectProvider?.data).toMatchObject(expected)

		// Choose a new provider
		const newProvider = await generateWallet()
		await createSelectProvider(
			waku,
			seeker,
			{
				marketplace: {
					address,
					chainId: 1337n,
					name: 'Marketplace',
				},
				provider: newProvider.address,
				item,
			},
			{ sigPubKey, ecdhPubKey },
		)

		// Make sure the event was called again
		expected.permitProvider.provider = arrayify(newProvider.address)

		// Except an update on the event
		selectProvider = await callback.next()
		expect(selectProvider?.data).toMatchObject(expected)

		// Expect the store query to be identical to the event
		selectProvider = await getSelectProvider(waku, address, item)
		expect(selectProvider?.data).toMatchObject(expected)
	}, 15_000)
})
