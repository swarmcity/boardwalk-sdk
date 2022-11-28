import { DecoderV0, MessageV0 } from 'js-waku/lib/waku_message/version_0'
import pDefer from 'p-defer'

// Lib
import { fileArrayBuffer, getHash, isFile, throwIfFasly } from '../lib/utils'
import {
	subscribeToLatestTopicData,
	postWakuMessage,
	decodeStore,
	DecodeStoreCallback,
} from '../lib/waku'

// Protos
import { ProfilePicture } from '../protos/profile-picture'

// Types
import type { WakuLight } from 'js-waku/lib/interfaces'
import type { WithPayload } from '../lib/types'

export const getProfilePictureTopic = (hash: string) => {
	return `/swarmcity/1/profile-picture-${hash}/proto`
}

export const createProfilePicture = async (
	waku: WakuLight,
	data: Uint8Array | File,
	type?: string,
): Promise<{
	hash: string
	message: { payload: Uint8Array }
}> => {
	let buffer: Uint8Array
	const tp: string | undefined = type
	if (isFile(data)) {
		buffer = new Uint8Array(await fileArrayBuffer(data))
		type = type ?? data.type
	} else {
		buffer = data
	}
	const hash = getHash(buffer)
	const message = await postWakuMessage(
		waku,
		getProfilePictureTopic(hash),
		ProfilePicture.encode({
			data: buffer,
			type: tp ?? 'unknown',
		}),
	)
	return { hash, message }
}

const decodeMessage = (message: WithPayload<MessageV0>): ProfilePicture | false => {
	try {
		return ProfilePicture.decode(message.payload)
	} catch (err) {
		return false
	}
}

type ProfilePictureRes = DecodeStoreCallback<ProfilePicture, MessageV0>

export const subscribeToProfilePicture = async (
	waku: WakuLight,
	hash: string,
	callback: (response?: ProfilePictureRes) => void,
	watch = true,
) => {
	if (!hash) {
		throw new Error('No hash was provided')
	}

	const decoders = [new DecoderV0(getProfilePictureTopic(hash))]
	subscribeToLatestTopicData(waku, decoders, decodeStore(decodeMessage, callback), {}, watch)
}

export const getProfilePicture = async (
	waku: WakuLight,
	hash: string,
): Promise<ProfilePictureRes> => {
	const defer = pDefer<ProfilePictureRes>()
	const callback = throwIfFasly(defer, 'Could not fetch profile picture')
	await subscribeToProfilePicture(waku, hash, callback, false)
	return defer.promise
}
