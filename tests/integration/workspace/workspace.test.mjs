import { after, before, describe, test } from "node:test";
import { createHarness } from "../../helpers/harness.mjs";
import { bootstrapAndPrune } from "./cases/bootstrap-and-prune.mjs";
import { completion } from "./cases/completion.mjs";
import { frontendReuse } from "./cases/frontend-reuse.mjs";
import { history } from "./cases/history.mjs";
import { hooks as hookCases } from "./cases/hooks.mjs";
import { identityAndCheckpoint } from "./cases/identity-and-checkpoint.mjs";

describe("workspace integration", { concurrency: 1 }, () => {
  let harness;

  before(async () => {
    harness = await createHarness("agrimap-workspace-");
  });

  after(async () => {
    await harness?.cleanup();
  });

  test("bootstrap, state layout, and retention", () => bootstrapAndPrune(harness));
  test("requester identity, task start, and checkpoints", () => identityAndCheckpoint(harness));
  test("provider hooks and context refresh", () => hookCases(harness));
  test("completion gates and non-complete outcomes", () => completion(harness));
  test("audit history, compatibility, and Git durability", () => history(harness));
  test("frontend reuse index lifecycle", () => frontendReuse(harness));
});
