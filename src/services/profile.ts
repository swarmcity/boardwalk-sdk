import { getAddress } from '@ethersproject/address'
import { DecoderV0, MessageV0 } from 'js-waku/lib/waku_message/version_0'
import { WakuLight } from 'js-waku/lib/interfaces'
import pDefer from 'p-defer'

// Types
import type { Signer } from 'ethers'
import type { WithPayload } from '../types'

// Protos
import { Profile } from '../protos/profile'

// Lib
import {
	subscribeToLatestTopicData,
	postWakuMessage,
	DecodeStoreCallback,
	decodeStore,
	subscribeCombineCallback,
} from '../lib/waku'
import { createSignedProto, decodeSignedPayload, EIP712Config } from '../lib/eip-712'

export type CreateProfile = {
	username: string
	pictureHash: Uint8Array
	date: string
}

// EIP-712
const eip712Config: EIP712Config = {
	domain: {
		name: 'Swarm.City',
		version: '1',
		salt: '0xe3dd854eb9d23c94680b3ec632b9072842365d9a702ab0df7da8bc398ee52c7d', // keccak256('profile')
	},
	types: {
		Profile: [
			{ name: 'address', type: 'address' },
			{ name: 'username', type: 'string' },
			{ name: 'pictureHash', type: 'bytes' },
			{ name: 'date', type: 'string' },
		],
	},
}

export const getProfileTopic = (address?: string) => {
	return address ? `/swarmcity/1/profile-${getAddress(address)}/proto` : ''
}

const decodeMessage = (message: WithPayload<MessageV0>): Profile | false => {
	return decodeSignedPayload(
		eip712Config,
		{
			formatValue: (profile, address) => ({ ...profile, address }),
			getSigner: (profile) => profile.address,
		},
		Profile,
		message.payload,
	)
}

export const createProfile = async (waku: WakuLight, input: CreateProfile, signer: Signer) => {
	const topic = getProfileTopic(await signer.getAddress())
	const payload = await createSignedProto(
		eip712Config,
		(signer: Uint8Array) => ({ address: signer, ...input }),
		(signer: string) => ({ address: signer, ...input }),
		Profile,
		signer,
	)

	return postWakuMessage(waku, topic, payload)
}

export type ProfileRes = DecodeStoreCallback<Profile, MessageV0>

export const subscribeToProfile = async (
	waku: WakuLight,
	address: string,
	callback: (data: Profile, message: MessageV0) => void,
	onDone?: () => void,
	watch = true,
) => {
	const decoders = [new DecoderV0(getProfileTopic(address))]
	return subscribeToLatestTopicData(
		waku,
		decoders,
		decodeStore(decodeMessage, callback, true),
		onDone,
		{},
		watch,
	)
}

export const getProfile = async (waku: WakuLight, address: string): Promise<ProfileRes> => {
	const defer = pDefer<ProfileRes>()
	const callback = subscribeCombineCallback(defer.resolve)
	const notFound = () => defer.reject(new Error('Could not fetch profile'))
	await subscribeToProfile(waku, address, callback, notFound, false)
	return defer.promise
}
