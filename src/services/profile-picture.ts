import { DecoderV0, MessageV0 } from 'js-waku/lib/waku_message/version_0'
import pDefer from 'p-defer'
import { sha256 } from '@ethersproject/sha2'

// Lib
import { blobArrayBuffer, isBlob } from '../lib/blob'
import {
	subscribeToLatestTopicData,
	postWakuMessage,
	decodeStore,
	DecodeStoreCallback,
} from '../lib/waku'
import { throwIfFasly } from '../lib/tools'

// Protos
import { ProfilePicture } from '../protos/profile-picture'

// Types
import type { WakuLight } from 'js-waku/lib/interfaces'
import type { WithPayload } from '../lib/types'

export const getProfilePictureTopic = (hash: string) => {
	return `/swarmcity/1/profile-picture-${hash}/proto`
}

export const createProfilePicture = async <Data extends Uint8Array | Blob>(
	waku: WakuLight,
	data: Data,
	type?: Data extends Uint8Array ? string : never,
): Promise<{
	hash: string
	message: { payload: Uint8Array }
}> => {
	let buffer: Uint8Array
	let tp: string | undefined = type

	if (isBlob(data)) {
		buffer = new Uint8Array(await blobArrayBuffer(data))
		tp = data.type
	} else {
		buffer = data
	}

	if (!tp) {
		throw new Error('unknown image type')
	}

	const hash = sha256(buffer)
	const message = await postWakuMessage(
		waku,
		getProfilePictureTopic(hash),
		ProfilePicture.encode({
			data: buffer,
			type: tp,
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
	subscribeToLatestTopicData(waku, decoders, decodeStore(decodeMessage, callback, true), {}, watch)
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
