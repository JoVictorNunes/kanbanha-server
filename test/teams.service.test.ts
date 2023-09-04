import { describe, beforeEach, vi, it, expect } from "vitest";
import teamsService from "../src/services/teams";
import prismaMock from "../src/services/__mocks__/prisma";

vi.mock("../src/services/prisma");

describe("Teams Service", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  // ...
});
