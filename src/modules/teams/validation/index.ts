import Joi from "joi";

export const CreateTeamSchema = Joi.object({
  projectId: Joi.string().uuid().required(),
  members: Joi.array().items(Joi.string().uuid()).unique(),
  name: Joi.string().min(3).max(12).required(),
}).required();

export const DeleteTeamSchema = Joi.object({
  id: Joi.string().uuid().required()
}).required();

export const UpdateTeamSchema = Joi.object({
  teamId: Joi.string().uuid().required(),
  name: Joi.string().min(3).max(12).required(),
}).required();
