import Joi from "joi";

export const CreateTeamSchema = Joi.object({
  projectId: Joi.string().uuid().required(),
  members: Joi.array().items(Joi.string().uuid().required(), Joi.string().uuid()).unique(),
  name: Joi.string().min(3).max(12),
}).required();

export const DeleteTeamSchema = Joi.string().uuid().required();

export const UpdateTeamSchema = Joi.object({
  teamId: Joi.string().uuid().required(),
  name: Joi.string().min(3).max(12),
}).required();
