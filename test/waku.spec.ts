import { getWaku } from '../src/waku'

describe("waku", () => {
  test("send and receive message", async () => {
    const waku = await getWaku()

    console.log(waku.isStarted());
  });
});
