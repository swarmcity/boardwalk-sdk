import { multiaddr } from '@multiformats/multiaddr'
import { Protocols, PageDirection } from 'js-waku'
import { createLightNode, CreateOptions } from 'js-waku/lib/create_waku'
import { waitForRemotePeer } from 'js-waku/lib/wait_for_remote_peer'
import { EncoderV0 } from 'js-waku/lib/waku_message/version_0'

// Types
import type { Decoder, Message, WakuLight } from 'js-waku/lib/interfaces'
import type { QueryOptions } from 'js-waku/lib/waku_store'
import type { WithPayload } from './types'

const defaultOptions: CreateOptions = {}

export async function getWaku(
	protocols?: Protocols[],
	options?: CreateOptions,
): Promise<WakuLight> {
	const waku = await createLightNode(options ?? defaultOptions)

	await waku.start()
	await waku.dial(
		// @ts-expect-error Some weird bug with [inspect]
		multiaddr(
			'/ip4/127.0.0.1/tcp/8000/ws/p2p/16Uiu2HAm53sojJN72rFbYg6GV2LpRRER9XeWkiEAhjKy3aL9cN5Z',
		),
	)
	await waitForRemotePeer(waku, protocols)

	return waku
}

export const postWakuMessage = async (waku: WakuLight, topic: string, payload: Uint8Array) => {
	// Post the metadata on Waku
	const message = { payload }

	// Send the message
	await waku.lightPush.push(new EncoderV0(topic), { payload })

	// Return message
	return message
}

export const subscribeToLatestTopicData = <Msg extends Message>(
	waku: WakuLight,
	decoders: Decoder<Msg>[],
	callback: (message?: Promise<Msg | undefined>) => Promise<boolean>,
	options?: QueryOptions | undefined,
	watch?: boolean,
) => {
	// eslint-disable-next-line @typescript-eslint/no-extra-semi
	;(async () => {
		const generator = waku.store.queryGenerator(decoders, {
			pageDirection: PageDirection.BACKWARD,
			pageSize: 1,
		})

		for await (const messages of generator) {
			for (const message of messages) {
				if (await callback(message)) {
					return
				}
			}
		}

		callback()
	})()

	if (watch) {
		return {
			unsubscribe: waku.filter.subscribe(decoders, wrapFilterCallback(callback), options),
		}
	}
}

export const wrapFilterCallback = <Msg extends Message>(
	callback: (message: Promise<Msg | undefined>) => Promise<unknown>,
) => {
	return (message: Msg) => void callback(Promise.resolve(message))
}

export type DecodeStoreCallback<Data, Msg extends Message> = { data: Data; message: Msg }

export const decodeStore = <Data, Msg extends Message>(
	decodeMessage: (message: WithPayload<Msg>) => Data | false,
	callback: (result?: DecodeStoreCallback<Data, Msg>) => void,
) => {
	return async (msg: Promise<Msg | undefined> | undefined) => {
		if (!msg) {
			callback()
			return true
		}

		const message = (await msg) as WithPayload<Msg>
		if (!message) {
			return false
		}

		const data = decodeMessage(message)
		if (data) {
			callback({ data, message })
			return true
		}

		return false
	}
}