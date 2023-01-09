import { Protocols } from 'js-waku'
import { afterEach, describe, expect, test } from 'vitest'
import { randomBytes } from 'node:crypto'
import { arrayify } from 'ethers/lib/utils'
import pDefer from 'p-defer'

// Utils
import { generateWallet } from '../utils/ethers'
import { pEvent } from '../utils/p-event'
import { cleanup, CleanUpFunction } from '../utils/cleanup'

// Services
import {
	createProfile,
	getProfile,
	ProfileRes,
	subscribeToProfile,
} from '../../src/services/profile'

// Lib
import { getWaku, subscribeCombineCallback } from '../../src/lib/waku'

describe('profile', async () => {
	const waku = await getWaku([Protocols.LightPush, Protocols.Filter])

	const cleanupFns: CleanUpFunction[] = []
	afterEach(cleanup.bind(null, cleanupFns))

	test('can fetch profile after creation', async () => {
		const user = await generateWallet()
		const input = {
			username: 'Kars',
			pictureHash: arrayify(randomBytes(20)),
			date: new Date().toISOString(),
		}

		await createProfile(waku, input, user)

		const { data } = await getProfile(waku, user.address)
		expect(data).toMatchObject({
			...input,
			address: arrayify(user.address),
		})
	})

	test('getProfile throws if the profile does not exist', async () => {
		const user = await generateWallet()
		await expect(getProfile(waku, user.address)).rejects.toThrow(
			new Error('Could not fetch profile'),
		)
	})

	test('getProfile fetches the latest version', async () => {
		const user = await generateWallet()
		let input

		for (let i = 0; i < 5; i++) {
			input = {
				username: randomBytes(20).toString('hex'),
				pictureHash: arrayify(randomBytes(20)),
				date: new Date().toISOString(),
			}
			await createProfile(waku, input, user)
		}

		const { data } = await getProfile(waku, user.address)
		expect(data).toMatchObject({
			...input,
			address: arrayify(user.address),
		})
	})

	test('can subscribe to profile updates', async () => {
		const user = await generateWallet()
		const callback = pEvent<ProfileRes | undefined>()
		const done = pDefer()

		const combine = subscribeCombineCallback(callback.listener)
		const result = await subscribeToProfile(waku, user.address, combine, done.resolve)
		await result?.unsubscribe.then((fn) => cleanupFns.push(fn))

		// The store query is done and not results are available
		expect(await done.promise).toEqual(undefined)

		for (let i = 0; i < 5; i++) {
			const input = {
				username: randomBytes(20).toString('hex'),
				pictureHash: arrayify(randomBytes(20)),
				date: new Date().toISOString(),
			}
			await createProfile(waku, input, user)

			const next = await callback.next()
			expect(next?.data).toMatchObject({
				...input,
				address: arrayify(user.address),
			})
		}
	})
})
