import { DecoderV0, MessageV0 } from 'js-waku/lib/waku_message/version_0'

import { fileArrayBuffer, getHash, isFile } from '../lib/utils'
import { fetchLatestTopicData, postWakuMessage } from '../lib/waku'

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

interface ProfilePictureRes {
	picture: ProfilePicture
	payload: Uint8Array
}

export const retrieveProfilePicture = async (
	waku: WakuLight,
	hash: string,
): Promise<ProfilePictureRes> => {
	if (!hash) {
		throw new Error('No hash was provided')
	}

	const decoders = [new DecoderV0(getProfilePictureTopic(hash))]
	return new Promise<ProfilePictureRes>((resolve, reject) => {
		fetchLatestTopicData(waku, decoders, async (msg: Promise<MessageV0 | undefined>) => {
			const message = (await msg) as WithPayload<MessageV0>
			if (!message) {
				reject(new Error('Could not fetch profile picture'))
			}

			const picture = decodeMessage(message)
			if (picture) {
				resolve({ picture, payload: message.payload })
			}
		})
	})
}
