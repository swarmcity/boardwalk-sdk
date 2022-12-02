import { execSync } from 'child_process'

// Types
import type { BigNumberish, Overrides, Wallet } from 'ethers'
import type { Marketplace, MarketplaceFactory, MarketplaceList, MintableERC20 } from '../../src/abi'

// Services
import { getMarketplaceContract } from '../../src/services/marketplace'

// ABIs
import { factories } from '../../src/abi'

// Config
const contracts_dir = './lib/boardwalk-contracts'

// Contract factories
const getERC20 = factories.MintableERC20__factory.connect
const getMarketplaceFactory = factories.MarketplaceFactory__factory.connect
const getMarketplaceList = factories.MarketplaceList__factory.connect

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
): Promise<MintableERC20> => {
	const address = deploy('MintableERC20', decimals.toString())
	const erc20 = getERC20(address, deployer)
	await erc20.init(name, symbol, deployer.address)
	return erc20
}

export const deployMarketplaceFactory = async (deployer: Wallet): Promise<MarketplaceFactory> => {
	const address = deploy('MarketplaceFactory')
	return getMarketplaceFactory(address, deployer)
}

export const deployMarketplaceList = async (deployer: Wallet): Promise<MarketplaceList> => {
	const address = deploy('MarketplaceList')
	return getMarketplaceList(address, deployer)
}

export const deployMarketplace = async (
	factory: string,
	deployer: Wallet,
	token: string,
	name: string,
	fee: BigNumberish,
	metadata: string,
	overrides?: Overrides,
): Promise<Marketplace> => {
	const tx = await getMarketplaceFactory(factory, deployer).create(
		token,
		name,
		fee,
		metadata,
		overrides,
	)
	const { events } = await tx.wait()

	const event = events?.find(({ event }) => event === 'MarketplaceCreated')
	const address = event?.args?.addr

	if (!address) {
		throw new Error('no address found in the events')
	}

	return getMarketplaceContract(address, deployer)
}
