import { multiaddr } from "@multiformats/multiaddr";
import { createLightNode, CreateOptions } from "js-waku/lib/create_waku";

import type { WakuLight } from "js-waku/lib/interfaces";

const defaultOptions: CreateOptions = {};

export async function getWaku(options?: CreateOptions): Promise<WakuLight> {
  const waku = await createLightNode(options ?? defaultOptions);

  await waku.start();

  // @ts-expect-error Some weird bug with [inspect]
  await waku.dial(multiaddr("/ip4/0.0.0.0/tcp/60000"));

  return waku;
}
