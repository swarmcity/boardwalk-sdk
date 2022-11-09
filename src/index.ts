import { Provider } from '@ethersproject/abstract-provider'
import {Contract, Signer} from 'ethers'

import MarketplaceFactoryJSON from './abis/MarketplaceFactory.json'
import ERC20 from './abis/MintableERC20.json'

export const getMarketplaceFactory = (address: string, signer?: Signer | Provider) => new Contract(address, MarketplaceFactoryJSON.abi, signer)
export const getERC20 = (address: string, signer?: Signer | Provider) => new Contract(address, ERC20.abi, signer)