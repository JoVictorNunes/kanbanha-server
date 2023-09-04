import { Socket, Server } from "socket.io";
import httpServer from "./server";

type UUID = string;

type Project = {
  id: string;
  name: string;
  ownerId: string;
};

type Task = {
  id: UUID;
  createdAt: Date;
  date: Date;
  description: string;
  finishedAt: Date | null;
  inDevelopmentAt: Date | null;
  inReviewAt: Date | null;
  dueDate: Date;
  assignees: UUID[];
  status: "active" | "ongoing" | "review" | "finished";
  teamId: UUID;
  index: number;
};

type Team = {
  id: UUID;
  name: string;
  projectId: UUID;
  members: Array<string>;
};

type Member = {
  id: UUID;
  email: string;
  name: string;
  role: string;
  online: boolean;
};

type ResponseCallback = (response: { code: number; message: string }) => void;
type ReadCallback<T> = (data: T) => void;

type ProjectsCreateData = { name: string };
type ProjectsUpdateData = { id: UUID; name: string };
type ProjectsDeleteData = UUID;

type TeamsCreateData = { projectId: UUID; name: string; members: Array<UUID> };
type TeamsUpdateData = { teamId: UUID; name: string };
type TeamsDeleteData = UUID;
type TeamsAddMemberData = { teamId: UUID; memberId: UUID };
type TeamsRemoveMemberData = TeamsAddMemberData;

type TasksCreateData = {
  date: number;
  description: string;
  dueDate: number;
  assignees: UUID[];
  teamId: UUID;
  status: Task["status"];
};
type TasksUpdateData = {
  id: UUID;
  date: number;
  description: string;
  dueDate: number;
  assignees: UUID[];
};
type TasksDeleteData = UUID;
type TasksMoveData = {
  taskId: UUID;
  status: Task["status"];
  index: number;
};

type MemberCreateData = {
  email: string;
  password: string;
  name: string;
  role: string;
};
type MemberUpdateData = {
  email: string;
  name: string;
  role: string;
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

  "members:create": (member: Member) => void;
  "members:update": (member: Member) => void;
  "members:delete": (memberId: UUID) => void;
  "members:member_connected": (memberId: UUID) => void;
  "members:member_disconnected": (memberId: UUID) => void;
}

interface ClientToServerEvents {
  "projects:create": (data: ProjectsCreateData, callback: ResponseCallback) => void;
  "projects:read": (callback: ReadCallback<Array<Project>>) => void;
  "projects:update": (data: ProjectsUpdateData, callback: ResponseCallback) => void;
  "projects:delete": (projectId: ProjectsDeleteData, callback: ResponseCallback) => void;

  "teams:create": (data: TeamsCreateData, callback: ResponseCallback) => void;
  "teams:read": (callback: ReadCallback<Array<Team>>) => void;
  "teams:update": (data: TeamsUpdateData, callback: ResponseCallback) => void;
  "teams:delete": (teamId: TeamsDeleteData, callback: ResponseCallback) => void;
  "teams:add_member": (data: TeamsAddMemberData, callback: ResponseCallback) => void;
  "teams:remove_member": (data: TeamsRemoveMemberData, callback: ResponseCallback) => void;

  "tasks:create": (data: TasksCreateData, callback: ResponseCallback) => void;
  "tasks:read": (callback: ReadCallback<Array<Task>>) => void;
  "tasks:update": (data: TasksUpdateData, callback: ResponseCallback) => void;
  "tasks:delete": (taskId: TasksDeleteData, callback: ResponseCallback) => void;
  "tasks:move": (data: TasksMoveData, callback: ResponseCallback) => void;

  "members:create": (data: MemberCreateData, callback: ResponseCallback) => void;
  "members:read": (callback: ReadCallback<Array<Member>>) => void;
  "members:update": (data: MemberUpdateData, callback: ResponseCallback) => void;
  "members:delete": (callback: ResponseCallback) => void;
}

interface InterServerEvents {
  ping: () => void;
}

export interface SocketData {
  member: {
    id: string;
    email: string;
    name: string;
    role: string;
  };
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

export const CLIENT_TO_SERVER_EVENTS = {
  MEMBERS: {
    CREATE: "members:create",
    READ: "members:read",
    UPDATE: "members:update",
    DELETE: "members:delete",
  },
  TEAMS: {
    CREATE: "teams:create",
    READ: "teams:read",
    UPDATE: "teams:update",
    DELETE: "teams:delete",
    ADD_MEMBER: "teams:add_member",
    REMOVE_MEMBER: "teams:remove_member",
  },
  TASKS: {
    CREATE: "tasks:create",
    READ: "tasks:read",
    UPDATE: "tasks:update",
    DELETE: "tasks:delete",
    MOVE: "tasks:move",
  },
  PROJECTS: {
    CREATE: "projects:create",
    READ: "projects:read",
    UPDATE: "projects:update",
    DELETE: "projects:delete",
  },
} as const;

export const SERVER_TO_CLIENT_EVENTS = {
  MEMBERS: {
    CREATE: "members:create",
    UPDATE: "members:update",
    DELETE: "members:delete",
    CONNECTED: "members:member_connected",
    DISCONNECTED: "members:member_disconnected",
  },
  TEAMS: {
    CREATE: "teams:create",
    UPDATE: "teams:update",
    DELETE: "teams:delete",
  },
  TASKS: {
    CREATE: "tasks:create",
    UPDATE: "tasks:update",
    DELETE: "tasks:delete",
  },
  PROJECTS: {
    CREATE: "projects:create",
    UPDATE: "projects:update",
    DELETE: "projects:delete",
  },
} as const;

const io = new Server<ClientToServerEvents, ServerToClientsEvents, InterServerEvents, SocketData>(
  httpServer,
  {
    cors: {
      origin: "*",
    },
  }
);

export default io;
