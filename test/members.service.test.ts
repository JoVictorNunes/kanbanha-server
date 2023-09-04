import { describe, beforeEach, vi, it, expect } from "vitest";
import membersService from "../src/services/members";
import prismaMock from "../src/services/__mocks__/prisma";

vi.mock("../src/services/prisma");

describe("Members Service", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  // ...
});
