import pDefer from 'p-defer'
import { describe, expect, test } from 'vitest'

// Utils
import { pEvent } from './p-event'

describe('p-event', async () => {
	test('works when calling next once after the listener was called', async () => {
		const defer = pEvent<number>()

		defer.listener(1)

		await expect(defer.next()).resolves.toEqual(1)
	})

	test('works when calling next once before the listener is called', async () => {
		const defer = pEvent<number>()
		const testDefer = pDefer()

		expect(defer.next()).resolves.toEqual(2).then(testDefer.resolve)

		defer.listener(2)
		await testDefer.promise
	})

	test('works when calling next twice after two listeners were called', async () => {
		const defer = pEvent<number>()

		defer.listener(1)
		defer.listener(2)

		await expect(defer.next()).resolves.toEqual(1)
		await expect(defer.next()).resolves.toEqual(2)
	})

	test('works when calling next twice before the listener is called twice', async () => {
		const defer = pEvent<number>()
		const testDefers = [pDefer(), pDefer()]

		expect(defer.next()).resolves.toEqual(3).then(testDefers[0].resolve)
		expect(defer.next()).resolves.toEqual(4).then(testDefers[1].resolve)

		defer.listener(3)
		defer.listener(4)

		await testDefers[0].promise
		await testDefers[1].promise
	})

	test('works with a mixture of events', async () => {
		const defer = pEvent<number>()
		const testDefers = [pDefer(), pDefer()]

		expect(defer.next()).resolves.toEqual(3).then(testDefers[0].resolve)
		expect(defer.next()).resolves.toEqual(4).then(testDefers[1].resolve)

		defer.listener(3)
		defer.listener(4)
		defer.listener(5)
		defer.listener(6)

		await testDefers[0].promise
		await testDefers[1].promise

		await expect(defer.next()).resolves.toEqual(5)
		await expect(defer.next()).resolves.toEqual(6)
	})
})
