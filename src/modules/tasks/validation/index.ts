import Joi from "joi";

export const CreateTaskSchema = Joi.object({
  assignees: Joi.array().items(Joi.string().uuid().required(), Joi.string().uuid()).required(),
  date: Joi.number().integer().required(),
  description: Joi.string().min(3).max(200).required(),
  dueDate: Joi.number().integer().required(),
  teamId: Joi.string().uuid().required(),
  status: Joi.string().equal("active", "ongoing", "review", "finished").required(),
}).required();

export const DeleteTaskSchema = Joi.string().uuid().required();

export const UpdateTaskSchema = Joi.object({
  assignees: Joi.array().items(Joi.string().uuid().required(), Joi.string().uuid()).required(),
  date: Joi.number().integer().required(),
  description: Joi.string().min(3).max(200).required(),
  dueDate: Joi.number().integer().required(),
  id: Joi.string().uuid().required(),
}).required();
