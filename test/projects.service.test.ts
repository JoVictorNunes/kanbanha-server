import { describe, beforeEach, vi, it, expect } from "vitest";
import projectService from "../src/services/projects";
import prismaMock from "../src/services/__mocks__/prisma";

vi.mock("../src/services/prisma");

describe("Projects Service", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  // ...
});
