import { Provider } from '@ethersproject/abstract-provider'
import { Signer} from 'ethers'

import { factories } from './abi'

export const getERC20 = (address: string, signer: Signer | Provider) => factories.MintableERC20__factory.connect(address, signer)
export const getMarketplaceFactory = (address: string, signer: Signer | Provider) => factories.MarketplaceFactory__factory.connect(address, signer)
export const getMarketplaceList = (address: string, signer: Signer | Provider) => factories.MarketplaceList__factory.connect(address, signer)