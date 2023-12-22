import { Socket, Server } from "socket.io";
import httpServer from "./server";

export type UUID = string;

export type Project = {
  id: UUID;
  name: string;
  ownerId: UUID;
  members: UUID[];
};

export type TaskStatuses = "active" | "ongoing" | "review" | "finished";

export type Task = {
  id: UUID;
  createdAt: Date;
  date: Date;
  description: string;
  finishedAt: Date | null;
  inDevelopmentAt: Date | null;
  inReviewAt: Date | null;
  dueDate: Date;
  assignees: UUID[];
  status: TaskStatuses;
  teamId: UUID;
  index: number;
};

export type Team = {
  id: UUID;
  name: string;
  projectId: UUID;
  members: UUID[];
};

export type Member = {
  id: UUID;
  email: string;
  name: string;
  role: string;
  online: boolean;
};

export type Invite = {
  id: UUID;
  projectId: UUID | null;
  memberId: UUID;
  text: string;
  when: Date;
  accepted: boolean;
};

export type ResponseCallback = (response: { code: number; message: string }) => void;
export type ReadCallback<T> = (data: T) => void;

export type CreateProjectData = { name: string; invited?: Array<string> };
export type UpdateProjectData = { id: UUID; name: string };
export type DeleteProjectData = { id: UUID };

export type CreateTeamData = { projectId: UUID; name: string; members?: Array<UUID> };
export type UpdateTeamData = { teamId: UUID; name: string };
export type DeleteTeamData = { id: UUID };
export type AddTeamMemberData = { teamId: UUID; memberId: UUID };
export type TeamsRemoveMemberData = AddTeamMemberData;

export type CreateTaskData = {
  date: number;
  description: string;
  dueDate: number;
  assignees: UUID[];
  teamId: UUID;
  status: TaskStatuses;
};
export type UpdateTaskData = {
  id: UUID;
  date: number;
  description: string;
  dueDate: number;
  assignees: UUID[];
};
export type DeleteTaskData = { id: UUID };
export type MoveTaskData = {
  taskId: UUID;
  status: TaskStatuses;
  index: number;
};

export type UpdateMemberData = {
  name: string;
  role: string;
};

export type CreateInviteData = {
  projectId: UUID;
  invited: Array<string>;
};
export type AccepteInviteData = {
  id: UUID;
};

interface ServerToClientsEvents {
  "projects:create": (project: Project) => void;
  "projects:update": (project: Project) => void;
  "projects:delete": (projectId: UUID) => void;

  "teams:create": (team: Team) => void;
  "teams:update": (team: Team) => void;
  "teams:delete": (teamId: UUID) => void;

  "tasks:create": (task: Task) => void;
  "tasks:update": (task: Task) => void;
  "tasks:delete": (taskId: UUID) => void;

  "members:update": (member: Member) => void;
  "members:member_connected": (memberId: UUID) => void;
  "members:member_disconnected": (memberId: UUID) => void;

  "invites:create": (invite: Invite) => void;
  "invites:update": (invite: Invite) => void;
}

interface ClientToServerEvents {
  "projects:create": (data: CreateProjectData, callback: ResponseCallback) => void;
  "projects:read": (callback: ReadCallback<Array<Project>>) => void;
  "projects:update": (data: UpdateProjectData, callback: ResponseCallback) => void;
  "projects:delete": (data: DeleteProjectData, callback: ResponseCallback) => void;

  "teams:create": (data: CreateTeamData, callback: ResponseCallback) => void;
  "teams:read": (callback: ReadCallback<Array<Team>>) => void;
  "teams:update": (data: UpdateTeamData, callback: ResponseCallback) => void;
  "teams:delete": (data: DeleteTeamData, callback: ResponseCallback) => void;
  "teams:add_member": (data: AddTeamMemberData, callback: ResponseCallback) => void;
  "teams:remove_member": (data: TeamsRemoveMemberData, callback: ResponseCallback) => void;

  "tasks:create": (data: CreateTaskData, callback: ResponseCallback) => void;
  "tasks:read": (callback: ReadCallback<Array<Task>>) => void;
  "tasks:update": (data: UpdateTaskData, callback: ResponseCallback) => void;
  "tasks:delete": (data: DeleteTaskData, callback: ResponseCallback) => void;
  "tasks:move": (data: MoveTaskData, callback: ResponseCallback) => void;

  "members:read": (callback: ReadCallback<Array<Member>>) => void;
  "members:update": (data: UpdateMemberData, callback: ResponseCallback) => void;

  "invites:create": (data: CreateInviteData, callback: ResponseCallback) => void;
  "invites:read": (callback: ReadCallback<Array<Invite>>) => void;
  "invites:accept": (data: AccepteInviteData, callback: ResponseCallback) => void;
}

interface InterServerEvents {
  ping: () => void;
}

export interface MemberData {
  id: string;
  email: string;
  name: string;
  role: string;
}

export interface SocketData {
  member: MemberData;
}

export type KanbanhaSocket = Socket<
  ClientToServerEvents,
  ServerToClientsEvents,
  InterServerEvents,
  SocketData
>;

export type KanbanhaServer = Server<
  ClientToServerEvents,
  ServerToClientsEvents,
  InterServerEvents,
  SocketData
>;

const io = new Server<ClientToServerEvents, ServerToClientsEvents, InterServerEvents, SocketData>(
  httpServer,
  {
    cors: {
      origin: "*",
    },
  }
);

export default io;
