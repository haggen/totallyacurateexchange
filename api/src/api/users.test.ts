import { expect, test } from "bun:test";

import { password } from "./users";

test("password", async () => {
	const hash = await password.hash("password");

	expect(hash).not.toBe("password");
	expect(await password.verify("password", hash)).toBeTrue();
	expect(await password.verify("wrong", hash)).toBeFalse();
});
