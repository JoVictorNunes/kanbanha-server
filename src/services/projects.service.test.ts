import { describe, beforeEach, vi, it, expect } from "vitest";
import projectService from "./projects.service";
import prismaMock from "./__mocks__/prisma.service";

vi.mock("./prisma.service");

describe("projects.service", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("getMembersInProject", () => {
    it("should return all members in a project", async () => {
      prismaMock.$transaction.mockImplementationOnce((callback) => callback(prismaMock));
      const mockTeamsInTheProject = [
        { id: "123", name: "Team 1", projectId: "123" },
        { id: "456", name: "Team 2", projectId: "123" },
        { id: "789", name: "Team 3", projectId: "123" },
      ];
      prismaMock.team.findMany.mockResolvedValueOnce(mockTeamsInTheProject);
      const mockMembersInTheProject = [
        { memberId: "123", teamId: "123" },
        { memberId: "123", teamId: "456" },
        { memberId: "456", teamId: "789" },
        { memberId: "456", teamId: "123" },
        { memberId: "789", teamId: "456" },
        { memberId: "789", teamId: "789" },
      ];
      prismaMock.membersOnTeam.findMany.mockResolvedValue(mockMembersInTheProject);
      const members = await projectService.getMembersInProject("123");
      expect(prismaMock.membersOnTeam.findMany).toHaveBeenCalledWith({
        where: {
          teamId: {
            in: ["123", "456", "789"],
          },
        },
      });
      expect(members).toHaveLength(3);
      expect(members).toContain("123");
      expect(members).toContain("456");
      expect(members).toContain("789");
    });
  });
});
