import { afterEach, describe, expect, test } from 'vitest'
import { Protocols } from 'js-waku'
import { randomBytes } from 'node:crypto'
import pDefer from 'p-defer'

// Utils
import { generateWallet } from '../utils/ethers'
import { generateKeyPair, randomBigInt } from '../utils/crypto'
import { pEvent } from '../utils/p-event'
import { cleanup, CleanUpFunction } from '../utils/cleanup'

// Services
import {
	createReply,
	getItemReplies,
	ItemReplyClean,
	subscribeToItemReplies,
} from '../../src/services/replies'

// Lib
import { getWaku } from '../../src/lib/waku'

// Helper functions
const generateKeyExchange = () => ({
	sigPubKey: generateKeyPair().publicKey,
	ecdhPubKey: generateKeyPair().publicKey,
})

describe('replies', async () => {
	const repliers = await Promise.all([generateWallet(), generateWallet(), generateWallet()])
	const waku = await getWaku([Protocols.LightPush, Protocols.Filter])

	const cleanupFns: CleanUpFunction[] = []
	afterEach(cleanup.bind(null, cleanupFns))

	test('create replies and fetch them afterwards', async () => {
		// Random arguments (to avoid clashing with previous test runs)
		const marketplace = '0x' + randomBytes(20).toString('hex')
		const item = randomBigInt()

		// Key exchange
		const keyExchanges = [generateKeyExchange(), generateKeyExchange()]

		// Post two replies
		await createReply(waku, marketplace, item, { text: 'First!' }, keyExchanges[0], repliers[0])
		await createReply(waku, marketplace, item, { text: '✋' }, keyExchanges[1], repliers[1])

		// Fetch replies
		const replies = await getItemReplies(waku, marketplace, item)
		expect(replies).toMatchObject([
			{
				from: repliers[0].address,
				item: item,
				keyExchange: keyExchanges[0],
				marketplace,
				text: 'First!',
			},
			{
				from: repliers[1].address,
				item: item,
				keyExchange: keyExchanges[1],
				marketplace,
				text: '✋',
			},
		])
	})

	test('subscribe to replies and create new ones before and after', async () => {
		// Random arguments (to avoid clashing with previous test runs)
		const marketplace = '0x' + randomBytes(20).toString('hex')
		const item = randomBigInt()

		// Key exchange
		const keyExchanges = [generateKeyExchange(), generateKeyExchange(), generateKeyExchange()]

		// Post two replies
		await createReply(waku, marketplace, item, { text: 'First' }, keyExchanges[0], repliers[0])

		// Subscribe to the replies
		const callback = pEvent<ItemReplyClean>()
		const done = pDefer()
		const result = subscribeToItemReplies(
			waku,
			marketplace,
			item,
			callback.listener,
			undefined,
			done.resolve,
			true,
		)
		await result?.then((fn) => cleanupFns.push(fn))

		// Expect the first reply to be available
		expect(await callback.next()).toMatchObject({
			from: repliers[0].address,
			item: item,
			keyExchange: keyExchanges[0],
			marketplace,
			text: 'First',
		})
		await expect(done.promise).resolves

		// Post two more replies
		await createReply(waku, marketplace, item, { text: 'Second' }, keyExchanges[1], repliers[1])
		await createReply(waku, marketplace, item, { text: 'Third' }, keyExchanges[2], repliers[2])

		// Expect the two replies to be called back
		expect(await callback.next()).toMatchObject({
			from: repliers[1].address,
			item: item,
			keyExchange: keyExchanges[1],
			marketplace,
			text: 'Second',
		})

		expect(await callback.next()).toMatchObject({
			from: repliers[2].address,
			item: item,
			keyExchange: keyExchanges[2],
			marketplace,
			text: 'Third',
		})
	})
})
