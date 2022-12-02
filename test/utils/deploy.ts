import { exec as execOld } from 'node:child_process'
import { promisify } from 'node:util'
import { getAddress } from 'ethers/lib/utils'

// Types
import type { BigNumberish, Overrides, Wallet } from 'ethers'
import type { Marketplace, MarketplaceFactory, MarketplaceList, MintableERC20 } from '../../src/abi'
import type { PromiseOrValue } from '../../src/abi/common'

// Services
import { getMarketplaceContract } from '../../src/services/marketplace'

// ABIs
import { factories } from '../../src/abi'

// Promisify
const exec = promisify(execOld)

// Config
const CONTRACTS_DIR = './lib/boardwalk-contracts'

// Contract factories
const getERC20 = factories.MintableERC20__factory.connect
const getMarketplaceFactory = factories.MarketplaceFactory__factory.connect
const getMarketplaceList = factories.MarketplaceList__factory.connect

const deploy = async (wallet: Wallet, contract: string, args?: string): Promise<string> => {
	const command = [
		'forge create',
		'--root ' + CONTRACTS_DIR,
		'--private-key ' + wallet.privateKey,
		contract,
	]

	if (args) {
		command.push(...['--constructor-args', args])
	}

	const start = 'Deployed to: '
	const { stdout } = await exec(command.join(' '), { encoding: 'utf-8' })
	const deployed = stdout.split('\n').find((line) => line.startsWith(start))

	if (!deployed) {
		throw new Error('deployed address not found')
	}

	return getAddress(deployed.trim().substring(start.length))
}

export const deployERC20 = async (
	deployer: Wallet,
	decimals: number,
	name: string,
	symbol: string,
): Promise<MintableERC20> => {
	const address = await deploy(deployer, 'MintableERC20', decimals.toString())
	const erc20 = getERC20(address, deployer)
	await erc20.init(name, symbol, deployer.address)
	return erc20
}

export const deployMarketplaceFactory = async (deployer: Wallet): Promise<MarketplaceFactory> => {
	const address = await deploy(deployer, 'MarketplaceFactory')
	return getMarketplaceFactory(address, deployer)
}

export const deployMarketplaceList = async (deployer: Wallet): Promise<MarketplaceList> => {
	const address = await deploy(deployer, 'MarketplaceList')
	return getMarketplaceList(address, deployer)
}

export const deployMarketplace = async (
	factory: string,
	deployer: Wallet,
	token: string,
	name: string,
	fee: BigNumberish,
	metadata: string,
	overrides?: Overrides & { from?: PromiseOrValue<string> },
): Promise<Marketplace> => {
	const tx = await getMarketplaceFactory(factory, deployer).create(
		token,
		name,
		fee,
		metadata,
		overrides || {},
	)
	const { events } = await tx.wait()

	const event = events?.find(({ event }) => event === 'MarketplaceCreated')
	const address = event?.args?.addr

	if (!address) {
		throw new Error('no address found in the events')
	}

	return getMarketplaceContract(address, deployer)
}
