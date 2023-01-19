import { MessageV1, SymDecoder, SymEncoder } from 'js-waku/lib/waku_message/version_1'
import { equals } from 'uint8arrays/equals'
import pDefer from 'p-defer'

// Services
import { DecodeStoreCallback, decodeStore, subscribeToWakuTopic } from '../lib/waku'

// Types
import type { WakuLight } from 'js-waku/lib/interfaces'
import type { WithPayload } from '../lib/types'

// Protos
import { ChatMessage as ChatMessageProto } from '../protos/chat-message'

// Types
type ChatMessage = {
	date: Date
	message: string
}

type PublicKeys = {
	seeker: Uint8Array
	provider: Uint8Array
	owner: Uint8Array
}

type PrivateKey = {
	private: Uint8Array
}

type ChatMessageRes = DecodeStoreCallback<ChatMessage, MessageV1>

type ChatKeys = {
	symmetric: Uint8Array
	signing: PublicKeys
}
/**
 * Create a topic for the item chat
 * @param marketplace
 * @param item
 */
export const getChatMessageTopic = (marketplace: string, item: bigint) => {
	return `/swarmcity/1/chat-message-${marketplace}-${item}/proto`
}

const decodeWakuMessage = (
	keys: PublicKeys,
	message: WithPayload<MessageV1>,
): ChatMessage | false => {
	if (!message.signaturePublicKey) {
		return false
	}

	const decoded = ChatMessageProto.decode(message.payload)
	const valid = (() => {
		for (const key of Object.values(keys)) {
			if (equals(message.signaturePublicKey, key)) {
				return true
			}
		}
		return false
	})()

	if (!valid) {
		return false
	}

	return {
		date: message.timestamp || new Date(),
		...decoded,
	}
}

/**
 * Post a chat message to Waku for a specific marketplace and item
 * @param waku
 * @param marketplace
 * @param item
 * @param message
 * @param keys
 */
export const postChatMessage = async (
	waku: WakuLight,
	marketplace: string,
	item: bigint,
	message: { message: string },
	keys: {
		symmetric: Uint8Array
		signing: PrivateKey
	},
) => {
	// Create the protobuf message
	const payload = ChatMessageProto.encode(message)

	// Post the message on Waku
	await waku.lightPush.push(
		new SymEncoder(getChatMessageTopic(marketplace, item), keys.symmetric, keys.signing.private),
		{ payload },
	)
}

export const subscribeToChatMessages = async (
	waku: WakuLight,
	marketplace: string,
	item: bigint,
	keys: ChatKeys,
	callback: (data: ChatMessage, message: MessageV1) => void,
	onError?: (error: string) => void,
	onDone?: () => void,
	watch = true,
) => {
	const topic = getChatMessageTopic(marketplace, item)
	const decoders = [new SymDecoder(topic, keys.symmetric)]
	return subscribeToWakuTopic(
		waku,
		decoders,
		decodeStore(decodeWakuMessage.bind(null, keys.signing), callback),
		onError,
		onDone,
		watch,
	)
}

/**
 *
 * @param waku Get the chat messages for a specific marketplace and item
 * @param marketplace
 * @param item
 * @param keys
 * @param callback
 * @param onError
 * @param onDone
 * @param watch
 * @returns
 */

export const getChatMessages = async (
	waku: WakuLight,
	marketplace: string,
	item: bigint,
	keys: ChatKeys,
): Promise<ChatMessageRes[]> => {
	const items: ChatMessageRes[] = []
	const defer = pDefer<ChatMessageRes[]>()
	const collect = (data: ChatMessage, message: MessageV1) => void items.push({ data, message })

	await subscribeToChatMessages(
		waku,
		marketplace,
		item,
		keys,
		collect,
		defer.reject,
		() => defer.resolve(items),
		false,
	)

	return defer.promise
}
