import { describe, expect, test } from 'vitest'
import { getReputation } from '../../src/services/reputation'

// Utils
import { deployERC20 } from '../utils/deploy'
import { generateWallet, getProvider } from '../utils/ethers'

describe('reputation', async () => {
	const provider = getProvider()
	const deployer = await generateWallet()
	const erc20 = await deployERC20(deployer, 18, 'Fake DAI', 'FDAI')

	test('content topic', async () => {
		const user = await generateWallet()

		// Mint 50 tokens
		await erc20.mint(user.address, 50n)
		expect(await getReputation(erc20.address, user.address, provider)).toEqual(50n)

		// Mint 5 tokens
		await erc20.mint(user.address, 5n)
		expect(await getReputation(erc20.address, user.address, provider)).toEqual(55n)
	})
})
