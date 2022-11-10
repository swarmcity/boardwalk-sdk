import { Provider } from "@ethersproject/abstract-provider";
import { BigNumberish, Signer } from "ethers";

import { factories, MarketplaceFactory, MintableERC20 } from "./abi";
import type { Marketplace } from "./abi/Marketplace";

export const getERC20 = (address: string, signer: Signer | Provider) =>
  factories.MintableERC20__factory.connect(address, signer);
export const getMarketplaceFactory = (
  address: string,
  signer: Signer | Provider
) => factories.MarketplaceFactory__factory.connect(address, signer);
export const getMarketplaceList = (
  address: string,
  signer: Signer | Provider
) => factories.MarketplaceList__factory.connect(address, signer);
export const getMarketplace = (address: string, signer: Signer | Provider) =>
  factories.Marketplace__factory.connect(address, signer);

interface EventMarketplaceCreatedData {
  marketplaceAddress: string;
  marketplaceName: string;
  providerRepAddress: string;
  seekerRepAddress: string;
}

interface CreateMarketplace {
  marketplace: Marketplace;
  providerRepToken: MintableERC20;
  seekerRepToken: MintableERC20;
}

export async function createMarketplace(
  marketplaceFactory: MarketplaceFactory,
  marketplaceTokenAddress: string,
  marketplaceName: string,
  marketplaceFee: BigNumberish,
  metadata: string
): Promise<CreateMarketplace> {
  const promise = new Promise<EventMarketplaceCreatedData>((resolve) => {
    marketplaceFactory.once(
      marketplaceFactory.filters["MarketplaceCreated"](),
      (
        marketplaceAddress,
        marketplaceName,
        providerRepAddress,
        seekerRepAddress
      ) => {
        resolve({
          marketplaceAddress,
          marketplaceName,
          providerRepAddress,
          seekerRepAddress,
        });
      }
    );
  });
  await marketplaceFactory.create(
    marketplaceTokenAddress,
    marketplaceName,
    marketplaceFee,
    metadata
  );

  // Wait for the Marketplace Created event result
  const res = await promise;

  return {
    marketplace: getMarketplace(
      res.marketplaceAddress,
      marketplaceFactory.signer
    ),
    providerRepToken: getERC20(
      res.providerRepAddress,
      marketplaceFactory.signer
    ),
    seekerRepToken: getERC20(res.seekerRepAddress, marketplaceFactory.signer),
  };
}
