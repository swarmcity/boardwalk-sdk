import { getWaku } from "../src/waku";
import {
  DecoderV0,
  EncoderV0,
  MessageV0,
} from "js-waku/lib/waku_message/version_0";

type CleanUpFunction = () => Promise<void>;

describe("waku", () => {
  let cleanupFns: CleanUpFunction[] = [];

  afterEach(async () => {
    await Promise.all(cleanupFns.map((fn) => fn()));
    cleanupFns = [];
  });

  test("send and receive message over PubSub", async () => {
    const waku = await getWaku();
    const encoder = new TextEncoder();
    const payload = encoder.encode("Test message");

    const promise = new Promise<MessageV0>((resolve) => {
      const unsubscribe = waku.filter.subscribe(
        [new DecoderV0("topic")],
        resolve
      );
      unsubscribe.then(cleanupFns.push);
    });

    waku.lightPush.push(new EncoderV0("topic"), { payload });
    const message = await promise;
    expect(message.payload).toEqual(payload);
  });
});
