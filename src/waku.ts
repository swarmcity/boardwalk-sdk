import { multiaddr } from '@multiformats/multiaddr'
import { Protocols } from 'js-waku'
import { createLightNode, CreateOptions } from 'js-waku/lib/create_waku'
import { waitForRemotePeer } from 'js-waku/lib/wait_for_remote_peer'

import type { WakuLight } from 'js-waku/lib/interfaces'

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
