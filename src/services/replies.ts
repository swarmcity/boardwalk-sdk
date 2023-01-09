import { Wallet } from 'ethers'
import { utils } from 'js-waku'
import { verifyTypedData } from '@ethersproject/wallet'
import { getAddress } from '@ethersproject/address'
import { DecoderV0, EncoderV0, MessageV0 } from 'js-waku/lib/waku_message/version_0'
import pDefer from 'p-defer'

// Types
import type { TypedDataDomain, TypedDataField } from '@ethersproject/abstract-signer'
import type { WakuLight } from 'js-waku/lib/interfaces'
import type { Signer } from 'ethers'
import type { WithPayload } from '../lib/types'

// Protos
import { ItemReply } from '../protos/item-reply'
import { KeyExchange } from '../protos/key-exchange'

// Lib
import { decodeStoreClean, subscribeToWakuTopic } from '../lib/waku'

export type CreateReply = {
	text: string
}

export type ItemReplyClean = {
	marketplace: string
	item: bigint
	text: string
	from: string
	signature: string
	keyExchange: KeyExchange
}

// EIP-712
const DOMAIN: TypedDataDomain = {
	name: 'Swarm.City',
	version: '1',

	// keccak256('marketplace-item-reply')
	salt: '0x7382101104be2061b115d6fbbf729e3000d6d57cab3710d57976c9af0036db23',
}

// The named list of all type definitions
const TYPES: Record<string, Array<TypedDataField>> = {
	Reply: [
		{ name: 'marketplace', type: 'string' },
		{ name: 'item', type: 'uint256' },
		{ name: 'from', type: 'address' },
		{ name: 'text', type: 'string' },
		{ name: 'keyExchange', type: 'KeyExchange' },
	],
	KeyExchange: [
		{ name: 'sigPubKey', type: 'bytes' },
		{ name: 'ecdhPubKey', type: 'bytes' },
	],
}

export const getItemTopic = (marketplace: string, item: string) => {
	return `/swarmcity/1/marketplace-${marketplace}-item-${item}/proto`
}

export const createReply = async (
	waku: WakuLight,
	marketplace: string,
	item: bigint,
	{ text }: CreateReply,
	keyExchange: KeyExchange,
	signer: Signer,
) => {
	// Get signer
	const from = await signer.getAddress()

	if (!(signer instanceof Wallet)) {
		throw new Error('not implemented yet')
	}

	// Data to sign and in the Waku message
	const data = { from, marketplace, item, text, keyExchange }

	// Sign the message
	const signatureHex = await signer._signTypedData(DOMAIN, TYPES, data)
	const signature = utils.hexToBytes(signatureHex)

	// Create the metadata
	const payload = ItemReply.encode({
		...data,
		from: utils.hexToBytes(from.substring(2).toLowerCase()),
		signature,
	})

	// Post the metadata on Waku
	await waku.lightPush.push(new EncoderV0(getItemTopic(marketplace, item.toString())), { payload })
}

const verifyReplySignature = (reply: ItemReply) => {
	const from = getAddress('0x' + utils.bytesToHex(reply.from))
	const recovered = verifyTypedData(
		DOMAIN,
		TYPES,
		{
			from,
			marketplace: reply.marketplace,
			item: reply.item,
			text: reply.text,
			keyExchange: reply.keyExchange,
		},
		reply.signature,
	)
	return recovered === from
}

const decodeWakuReply = async (
	message: WithPayload<MessageV0>,
): Promise<ItemReplyClean | false> => {
	try {
		const reply = ItemReply.decode(message.payload)
		return (
			verifyReplySignature(reply) && {
				marketplace: reply.marketplace,
				item: reply.item,
				text: reply.text,
				from: getAddress('0x' + utils.bytesToHex(reply.from)),
				signature: '0x' + utils.bytesToHex(reply.signature),
				keyExchange: reply.keyExchange,
			}
		)
	} catch (err) {
		return false
	}
}

export const subscribeToItemReplies = async (
	waku: WakuLight,
	marketplace: string,
	item: bigint,
	callback: (response: ItemReplyClean) => void,
	onError?: (error: string) => void,
	onDone?: () => void,
	watch = true,
) => {
	const topic = getItemTopic(marketplace, item.toString())
	const decoders = [new DecoderV0(topic)]
	return subscribeToWakuTopic(
		waku,
		decoders,
		decodeStoreClean(decodeWakuReply, callback),
		onError,
		onDone,
		watch,
	)
}

export const getItemReplies = async (
	waku: WakuLight,
	marketplace: string,
	item: bigint,
): Promise<ItemReplyClean[]> => {
	const items: ItemReplyClean[] = []
	const defer = pDefer<ItemReplyClean[]>()
	const collect = (item: ItemReplyClean) => void items.push(item)

	await subscribeToItemReplies(
		waku,
		marketplace,
		item,
		collect,
		defer.reject,
		() => defer.resolve(items),
		false,
	)

	return defer.promise
}
