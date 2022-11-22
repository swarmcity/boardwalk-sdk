// Types
import type { Signer } from 'ethers'
import type { Provider } from '@ethersproject/providers'

// ABIs
import { ERC20__factory } from '../abi/factories/ERC20__factory'

export const getReputationContract = ERC20__factory.connect

export const getReputation = async (
	token: string,
	user: string,
	signerOrProvider: Signer | Provider,
) => {
	const contract = getReputationContract(token, signerOrProvider)
	return await contract.balanceOf(user)
}
