import { readFileSync } from 'fs'
import { Protocols } from 'js-waku'
import { describe, expect, test } from 'vitest'

import { createProfilePicture, retrieveProfilePicture } from '../src/profile-picture'
import { getWaku } from '../src/waku'

describe('create and retrieve profile picture', () => {
	test('upload and retrieve PNG picture', async () => {
		const file = readFileSync('./test/data/avatar.png')
		const waku = await getWaku([Protocols.LightPush, Protocols.Filter])
		const imgUint8Array = new Uint8Array(file.buffer)

		const uploadRes = await createProfilePicture(waku, imgUint8Array, 'image/png')

		const retrieveRes = await retrieveProfilePicture(waku, uploadRes.hash)

		expect(uploadRes.hash).toBe(
			'0x2f6f0724931f4ef4b538d2c0021e1b4ac85917d9632f13057710109d044a88e1',
		)
		expect(retrieveRes.picture.type).toBe('image/png')
		expect(retrieveRes.picture.data.toString()).toEqual(imgUint8Array.toString())
	})

	test('upload and retrieve SVG picture', async () => {
		const file = readFileSync('./test/data/avatar.svg')
		const waku = await getWaku([Protocols.LightPush, Protocols.Filter])
		const imgUint8Array = new Uint8Array(file.buffer)

		const uploadRes = await createProfilePicture(waku, imgUint8Array, 'image/png')

		const retrieveRes = await retrieveProfilePicture(waku, uploadRes.hash)

		expect(uploadRes.hash).toBe(
			'0x031f532d2380310307bd35f03c98d76ce0907d61e9ff4fd8128bd56835eabf37',
		)
		expect(retrieveRes.picture.type).toBe('image/png')
		expect(retrieveRes.picture.data.toString()).toEqual(imgUint8Array.toString())
	})

	test('upload and retrieve picture without specifying type', async () => {
		const file = readFileSync('./test/data/avatar.svg')
		const waku = await getWaku([Protocols.LightPush, Protocols.Filter])
		const imgUint8Array = new Uint8Array(file.buffer)

		const uploadRes = await createProfilePicture(waku, imgUint8Array)

		const retrieveRes = await retrieveProfilePicture(waku, uploadRes.hash)

		expect(uploadRes.hash).toBe(
			'0x031f532d2380310307bd35f03c98d76ce0907d61e9ff4fd8128bd56835eabf37',
		)
		expect(retrieveRes.picture.type).toBe('unknown')
		expect(retrieveRes.picture.data.toString()).toEqual(imgUint8Array.toString())
	})
})
