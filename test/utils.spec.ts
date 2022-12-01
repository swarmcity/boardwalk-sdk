import { readFileSync } from 'fs'
import { expect, test } from 'vitest'

import { getHash } from '../src/lib/blob'

test('should correctly hash binary data', async () => {
	const filePng = readFileSync('./test/data/avatar.png')
	const fileSvg = readFileSync('./test/data/avatar.svg')

	const pngHash = getHash(new Uint8Array(filePng))
	const svgHash = getHash(new Uint8Array(fileSvg))

	expect(pngHash).toEqual('0x2f6f0724931f4ef4b538d2c0021e1b4ac85917d9632f13057710109d044a88e1')
	expect(svgHash).toEqual('0x031f532d2380310307bd35f03c98d76ce0907d61e9ff4fd8128bd56835eabf37')
})
