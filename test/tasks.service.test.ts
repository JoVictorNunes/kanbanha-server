import { describe, beforeEach, vi, it, expect } from "vitest";
import tasksService from "../src/services/tasks";
import prismaMock from "../src/services/__mocks__/prisma";

vi.mock("../src/services/prisma");

describe("Tasks Service", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  // ...
});
