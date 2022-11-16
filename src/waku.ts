import { multiaddr } from "@multiformats/multiaddr";
import { createLightNode, CreateOptions } from "js-waku/lib/create_waku";

import type { WakuLight } from "js-waku/lib/interfaces";

const defaultOptions: CreateOptions = {};

export async function getWaku(options?: CreateOptions): Promise<WakuLight> {
  const waku = await createLightNode(options ?? defaultOptions);

  await waku.start();

  await waku.dial(
    // @ts-expect-error Some weird bug with [inspect]
    multiaddr(
      "/ip4/127.0.0.1/tcp/60000/ws/p2p/16Uiu2HAmV2LtgL5Rx4WhnMShcZbXadkT8Lfa2GC38aJ7hDzKhPuo"
    )
  );

  return waku;
}
