import { MessageV1, SymDecoder, SymEncoder } from 'js-waku/lib/waku_message/version_1'
import { equals } from 'uint8arrays/equals'
import pDefer from 'p-defer'

// Services
import { decodeStore, DecodeStoreCallback, subscribeToLatestTopicData } from '../lib/waku'

// Types
import type { WakuLight } from 'js-waku/lib/interfaces'
import { WithPayload } from '../lib/types'

// Protos
import { ChatMessage as ChatMessageProto } from '../protos/chat-message'

// Types
type ChatMessage = {
	date: Date
	message: string
}

type PublicKeys = {
	me: Uint8Array
	them: Uint8Array
}

type PrivateKey = {
	private: Uint8Array
}

type ChatMessageRes = DecodeStoreCallback<ChatMessage, MessageV1>

type ChatKeys = {
	symmetric: Uint8Array
	signing: PublicKeys & PrivateKey
	encryption: PublicKeys & PrivateKey
}

export const getChatMessageTopic = (marketplace: string, item: bigint) => {
	return `/swarmcity/1/chat-message-${marketplace}-${item}/proto`
}

const decodeWakuMessage = async (
	keys: PublicKeys,
	message: WithPayload<MessageV1>,
): Promise<ChatMessage | false> => {
	if (!message.signaturePublicKey) {
		return false
	}

	const decoded = ChatMessageProto.decode(message.payload)
	const valid = (() => {
		const users: Array<keyof PublicKeys> = ['me', 'them']
		for (const user of users) {
			if (equals(message.signaturePublicKey, keys[user])) {
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
	callback: (response?: ChatMessageRes) => void,
	watch = true,
) => {
	const topic = getChatMessageTopic(marketplace, item)
	const decoders = [new SymDecoder(topic, keys.symmetric)]
	subscribeToLatestTopicData(
		waku,
		decoders,
		decodeStore(decodeWakuMessage.bind(null, keys.signing), callback),
		{},
		watch,
	)
}

export const getChatMessages = async (
	waku: WakuLight,
	marketplace: string,
	item: bigint,
	keys: ChatKeys,
): Promise<ChatMessageRes> => {
	const defer = pDefer<ChatMessageRes>()
	await subscribeToChatMessages(waku, marketplace, item, keys, defer.resolve, false)
	return defer.promise
}
