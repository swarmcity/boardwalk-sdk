import { describe, expect, test } from 'vitest'
import { Protocols } from 'js-waku'
import { randomBytes } from 'node:crypto'

// Utils
import { generateWallet } from '../utils/ethers'
import { generateKeyPair, randomBigInt } from '../utils/crypto'

// Services
import { createReply, getItemReplies } from '../../src/services/replies'

// Lib
import { getWaku } from '../../src/lib/waku'

// Helper functions
const generateKeyExchange = () => ({
	sigPubKey: generateKeyPair().publicKey,
	ecdhPubKey: generateKeyPair().publicKey,
})

describe('Should create a reply on an existing item', async () => {
	const repliers = await Promise.all([generateWallet(), generateWallet()])
	const waku = await getWaku([Protocols.LightPush, Protocols.Filter])

	test('create a reply on an item', async () => {
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
})
