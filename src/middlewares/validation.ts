import Joi from "joi";
import { Event } from "socket.io";
import { BadRequestException, InternalServerException, UnauthorizedException } from "@/exceptions";

// Invite
const AcceptInviteSchema = Joi.object({
  id: Joi.string().uuid().required(),
}).required();
const CreateInviteSchema = Joi.object({
  projectId: Joi.string().uuid().required(),
  invited: Joi.array().items(Joi.string().email()).unique().required(),
}).required();

// Member
const UpdateMemberSchema = Joi.object({
  email: Joi.string().email().required(),
  name: Joi.string().min(3).max(40).required(),
  role: Joi.string().min(3).max(40),
}).required();

// Project
const CreateProjectSchema = Joi.object({
  name: Joi.string().min(3).max(12).required(),
  invited: Joi.array().items(Joi.string().email()).unique(),
}).required();
const DeleteProjectSchema = Joi.object({
  id: Joi.string().uuid().required(),
}).required();
const UpdateProjectSchema = Joi.object({
  id: Joi.string().uuid().required(),
  name: Joi.string().min(3).max(12).required(),
}).required();

// Task
const CreateTaskSchema = Joi.object({
  assignees: Joi.array()
    .items(Joi.string().uuid().required(), Joi.string().uuid())
    .unique()
    .required(),
  date: Joi.number().integer().required(),
  description: Joi.string().min(3).max(200).required(),
  dueDate: Joi.number().integer().required(),
  teamId: Joi.string().uuid().required(),
  status: Joi.string().equal("active", "ongoing", "review", "finished").required(),
}).required();
const DeleteTaskSchema = Joi.object({
  id: Joi.string().uuid().required(),
});
const UpdateTaskSchema = Joi.object({
  assignees: Joi.array()
    .items(Joi.string().uuid().required(), Joi.string().uuid())
    .unique()
    .required(),
  date: Joi.number().integer().required(),
  description: Joi.string().min(3).max(200).required(),
  dueDate: Joi.number().integer().required(),
  id: Joi.string().uuid().required(),
}).required();
const MoveTaskSchema = Joi.object({
  taskId: Joi.string().uuid().required(),
  index: Joi.number().integer().min(0).required(),
  status: Joi.string().equal("active", "ongoing", "review", "finished").required(),
});

// Team
const CreateTeamSchema = Joi.object({
  projectId: Joi.string().uuid().required(),
  members: Joi.array().items(Joi.string().uuid()).unique(),
  name: Joi.string().min(3).max(12).required(),
}).required();
const DeleteTeamSchema = Joi.object({
  id: Joi.string().uuid().required(),
}).required();
const UpdateTeamSchema = Joi.object({
  teamId: Joi.string().uuid().required(),
  name: Joi.string().min(3).max(12).required(),
}).required();
const AddTeamMemberSchema = Joi.object({
  teamId: Joi.string().uuid().required(),
  memberId: Joi.string().uuid().required(),
});
const RemoveTeamMemberSchema = Joi.object({
  teamId: Joi.string().uuid().required(),
  memberId: Joi.string().uuid().required(),
});

const callbackSchema = Joi.func().arity(1).required();

const SCHEMA_RECORD: Record<string, Joi.ObjectSchema | null> = {
  "invites:accept": AcceptInviteSchema,
  "invites:create": CreateInviteSchema,
  "members:update": UpdateMemberSchema,
  "projects:create": CreateProjectSchema,
  "projects:update": UpdateProjectSchema,
  "projects:delete": DeleteProjectSchema,
  "teams:create": CreateTeamSchema,
  "teams:update": UpdateTeamSchema,
  "teams:delete": DeleteTeamSchema,
  "teams:add_member": AddTeamMemberSchema,
  "teams:remove_member": RemoveTeamMemberSchema,
  "tasks:create": CreateTaskSchema,
  "tasks:update": UpdateTaskSchema,
  "tasks:delete": DeleteTaskSchema,
  "tasks:move": MoveTaskSchema,
};

const ALLOWED_EVENTS = [
  "invites:accept",
  "invites:create",
  "invites:read",
  "members:read",
  "members:update",
  "projects:create",
  "projects:read",
  "projects:update",
  "projects:delete",
  "teams:create",
  "teams:read",
  "teams:update",
  "teams:delete",
  "teams:add_member",
  "teams:remove_member",
  "tasks:create",
  "tasks:read",
  "tasks:update",
  "tasks:delete",
  "tasks:move",
];

const isAuthorized = (eventName: string) => ALLOWED_EVENTS.includes(eventName);

export default async function validation(event: Event, next: (error?: Error) => void) {
  const [eventName, data, callback] = event;

  if (!isAuthorized(eventName)) {
    return next(new UnauthorizedException("Event not allowed."));
  }

  const dataSchema = SCHEMA_RECORD[eventName];

  try {
    if (dataSchema) {
      await dataSchema.validateAsync(data);
      await callbackSchema.validateAsync(callback);
    } else {
      // If there is not a schema, it is a reading event.
      // So, data will be the callback function.
      await callbackSchema.validateAsync(data);
    }
    next();
  } catch (e) {
    if (e instanceof Joi.ValidationError) {
      callback(new BadRequestException(e.message));
      return;
    }
    callback(new InternalServerException());
  }
}
