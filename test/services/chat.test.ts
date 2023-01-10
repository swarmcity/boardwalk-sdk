import { afterEach, describe, expect, test } from 'vitest'
import { Protocols } from 'js-waku'
import { randomBytes } from 'node:crypto'
import { getSharedSecret } from 'noble-secp256k1'
import { sha256 } from '@ethersproject/sha2'

// Utils
import { generateKeyPair, randomBigInt } from '../utils/crypto'
import { cleanup, CleanUpFunction } from '../utils/cleanup'

// Services
import { getChatMessages, postChatMessage } from '../../src/services/chat'

// Lib
import { getWaku } from '../../src/lib/waku'
import { arrayify } from 'ethers/lib/utils'

// Helper functions
const generateKeyPairs = () => ({
	ecdsa: generateKeyPair(),
	ecdh: generateKeyPair(),
})

describe('replies', async () => {
	const seeker = generateKeyPairs()
	const provider = generateKeyPairs()
	const owner = generateKeyPairs()
	const waku = await getWaku([Protocols.LightPush, Protocols.Filter])

	// Calculate symmetric key with ECDH
	const symmetric = arrayify(
		sha256(getSharedSecret(seeker.ecdh.privateKey, provider.ecdh.publicKey) as Uint8Array),
	)

	const postMessage = (
		marketplace: string,
		item: bigint,
		user: ReturnType<typeof generateKeyPairs>,
		message: string,
	) => {
		return postChatMessage(
			waku,
			marketplace,
			item,
			{ message },
			{
				symmetric,
				signing: { private: user.ecdsa.privateKey },
			},
		)
	}

	const cleanupFns: CleanUpFunction[] = []
	afterEach(cleanup.bind(null, cleanupFns))

	test('create chat messages and fetch them afterwards', async () => {
		// Random arguments (to avoid clashing with previous test runs)
		const marketplace = '0x' + randomBytes(20).toString('hex')
		const item = randomBigInt()
		const post = postMessage.bind(null, marketplace, item)

		const posts = [
			{ user: seeker, message: 'Hey! How are you?' },
			{ user: seeker, message: 'Good, you?' },
			{ user: seeker, message: "Same. Here's your artwork by the way!" },
			{ user: seeker, message: "Huh, that's not at all what I asked..." },
			{ user: seeker, message: "What's going on here?" },
		]

		// Post a few messages
		for (const { user, message } of posts) {
			await post(user, message)
		}

		// Fetch replies
		const messages = await getChatMessages(waku, marketplace, item, {
			symmetric,
			signing: {
				seeker: seeker.ecdsa.publicKey,
				provider: provider.ecdsa.publicKey,
				owner: owner.ecdsa.publicKey,
			},
		})
		expect(messages).toMatchObject(
			posts.map(({ user, message }) => ({
				data: { message },
				message: { signaturePublicKey: user.ecdsa.publicKey },
			})),
		)
	})
})
