import { readFileSync } from "fs";
import { test } from "vitest";

import { getHash } from "../src/utils";

test('should correctly hash binary data', async () => {
    const filePng = readFileSync('./test/data/avatar.png')
    const fileSvg = readFileSync('./test/data/avatar.svg')

    console.log({ png: getHash((new Uint8Array(filePng))), svg: getHash((new Uint8Array(fileSvg))) })
})