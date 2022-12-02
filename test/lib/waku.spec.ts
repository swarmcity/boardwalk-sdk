import { describe, test, afterEach, expect } from 'vitest'
import { DecoderV0, EncoderV0, MessageV0 } from 'js-waku/lib/waku_message/version_0'
import { Protocols } from 'js-waku'
import pDefer from 'p-defer'

// Utils
import { cleanup, CleanUpFunction } from '../utils/cleanup'

// Lib
import { getWaku } from '../../src/lib/waku'

describe('waku', () => {
	const cleanupFns: CleanUpFunction[] = []
	afterEach(cleanup.bind(null, cleanupFns))

	test('send and receive message over PubSub', async () => {
		const waku = await getWaku([Protocols.LightPush, Protocols.Filter])
		const encoder = new TextEncoder()
		const payload = encoder.encode('Test message')
		const deferred = pDefer<MessageV0>()

		const unsubscribe = await waku.filter.subscribe([new DecoderV0('topic')], deferred.resolve)
		cleanupFns.push(unsubscribe)

		await waku.lightPush.push(new EncoderV0('topic'), {
			payload,
		})

		const message = await deferred.promise
		expect(message.payload).toEqual(payload)
	})

	test('push a message an fetch it from the store', async () => {
		const waku = await getWaku([Protocols.LightPush, Protocols.Store])
		const encoder = new TextEncoder()
		const payload = encoder.encode('Test message')
		const topic = Math.random().toString()

		await waku.lightPush.push(new EncoderV0(topic), {
			payload,
		})

		const generator = await waku.store.queryGenerator([new DecoderV0(topic)])
		const { value, done } = await generator.next()
		expect(done).toBeTruthy
		expect(value).toHaveLength(1)

		const message = await value[0]
		expect(message.payload).toEqual(payload)
	})
})
