import { Socket, Server } from "socket.io";
import httpServer from "./server";

export type UUID = string;

export type Project = {
  id: string;
  name: string;
  ownerId: string;
  members: Array<UUID>;
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
  members: Array<string>;
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

export type CreateTeamData = { projectId: UUID; name: string; members: Array<UUID> };
export type UpdateTeamData = { teamId: UUID; name: string };
export type DeleteTeamData = UUID;
export type AddTeamMemberData = { teamId: UUID; memberId: UUID };
export type TeamsRemoveMemberData = AddTeamMemberData;

export type CreateTaskData = {
  date: number;
  description: string;
  dueDate: number;
  assignees: UUID[];
  teamId: UUID;
  status: Task["status"];
};
export type UpdateTaskData = {
  id: UUID;
  date: number;
  description: string;
  dueDate: number;
  assignees: UUID[];
};
export type DeleteTaskData = UUID;
export type MoveTaskData = {
  taskId: UUID;
  status: Task["status"];
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
  "projects:delete": (projectId: DeleteProjectData, callback: ResponseCallback) => void;

  "teams:create": (data: CreateTeamData, callback: ResponseCallback) => void;
  "teams:read": (callback: ReadCallback<Array<Team>>) => void;
  "teams:update": (data: UpdateTeamData, callback: ResponseCallback) => void;
  "teams:delete": (teamId: DeleteTeamData, callback: ResponseCallback) => void;
  "teams:add_member": (data: AddTeamMemberData, callback: ResponseCallback) => void;
  "teams:remove_member": (data: TeamsRemoveMemberData, callback: ResponseCallback) => void;

  "tasks:create": (data: CreateTaskData, callback: ResponseCallback) => void;
  "tasks:read": (callback: ReadCallback<Array<Task>>) => void;
  "tasks:update": (data: UpdateTaskData, callback: ResponseCallback) => void;
  "tasks:delete": (taskId: DeleteTaskData, callback: ResponseCallback) => void;
  "tasks:move": (data: MoveTaskData, callback: ResponseCallback) => void;

  "members:read": (callback: ReadCallback<Array<Member>>) => void;
  "members:update": (data: UpdateMemberData, callback: ResponseCallback) => void;

  "invites:create": (data: CreateInviteData, callback: ResponseCallback) => void;
  "invites:read": (callback: ReadCallback<Array<Invite>>) => void;
  "invites:accept": (inviteId: UUID, callback: ResponseCallback) => void;
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
  INVITES: {
    CREATE: "invites:create",
    READ: "invites:read",
    ACCEPT: "invites:accept",
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
  INVITES: {
    CREATE: "invites:create",
    UPDATE: "invites:update",
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
