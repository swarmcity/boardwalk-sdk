// Types
import type { Provider } from '@ethersproject/providers'

// ABIs
import { ERC20__factory } from '../abi/factories/ERC20__factory'

export const getReputationContract = ERC20__factory.connect

export const getReputation = async (token: string, user: string, provider: Provider) => {
	const contract = getReputationContract(token, provider)
	const reputation = await contract.balanceOf(user)
	return reputation.toBigInt()
}
