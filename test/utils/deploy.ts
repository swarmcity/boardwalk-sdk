import { execSync } from 'child_process'
import { Contract, Wallet } from 'ethers'

// Library
import { getERC20, getMarketplaceFactory, getMarketplaceList } from '../../src/index'

// Config
const contracts_dir = './lib/boardwalk-contracts'

const deploy = (contract: string, args?: string): string => {
	return execSync(
		`cd ${contracts_dir} && forge create --mnemonic ./mnemonic ${contract} ${
			args ? `--constructor-args ${args}` : ''
		} | grep 'Deployed to: ' | sed 's/Deployed to: //g'`,
		{ encoding: 'utf-8' },
	).trim()
}

export const deployERC20 = async (
	deployer: Wallet,
	decimals: number,
	name: string,
	symbol: string,
): Promise<Contract> => {
	console.log(`${name} token: deploying`)
	const address = deploy('MintableERC20', decimals.toString())
	console.log(`${name} token: deployed to ${address}`)

	const erc20 = getERC20(address, deployer)
	await erc20.init(name, symbol, deployer.address)
	console.log(`${name} token: initialized with ${name} ${symbol}`)

	return erc20
}

export const deployMarketplaceFactory = async (deployer: Wallet): Promise<Contract> => {
	console.log(`MarketplaceFactory: deploying`)
	const address = deploy('MarketplaceFactory')
	console.log(`MarketplaceFactory: deployed to ${address}`)
	return getMarketplaceFactory(address, deployer)
}

export const deployMarketplaceList = async (deployer: Wallet): Promise<Contract> => {
	console.log(`MarketplaceList: deploying`)
	const address = deploy('MarketplaceList')
	console.log(`MarketplaceList: deployed to ${address}`)
	return getMarketplaceList(address, deployer)
}
