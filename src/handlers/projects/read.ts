import { projectsService } from "@/services";
import { CLIENT_TO_SERVER_EVENTS, type KanbanhaServer, type KanbanhaSocket } from "@/io";
import withReadErrrorHandler from "@/handlers/withReadErrorHandler";

export default function read(io: KanbanhaServer, socket: KanbanhaSocket) {
  socket.on(
    CLIENT_TO_SERVER_EVENTS.PROJECTS.READ,
    withReadErrrorHandler(async (callback) => {
      const currentMember = socket.data.member!;
      const projects = await projectsService.readByMember(currentMember.id);
      const projectsMapped = projects.map((project) => {
        const owner = project.members.find((member) => member.owner)!;
        return {
          ...project,
          ownerId: owner.memberId,
          members: project.members.map((m) => m.memberId),
        };
      });
      callback(projectsMapped);
    })
  );
}