import { describe, test, beforeEach, expect } from 'vitest'

// Utils
import { generateWallet } from '../utils/ethers'

// Utils
import { deployERC20 } from '../utils/deploy'

// ABIs
import { MintableERC20 } from '../../src/abi'
import { getMarketplaceContract } from '../../src/services/marketplace'

describe('marketplace', async () => {
	const deployer = await generateWallet()

	let erc20: MintableERC20

	beforeEach(async () => {
		erc20 = await deployERC20(deployer, 13, 'Fake DAI', 'FDAI')
	})

	test('marketplace contract instance', async () => {
		const contract = getMarketplaceContract(erc20.address, deployer)

		expect(contract.address).to.equal(erc20.address)
		expect(contract.signer).to.equal(deployer)
		expect(contract.provider).to.equal(deployer.provider)

		expect(await contract.name()).toEqual('Fake DAI')
	})
})
