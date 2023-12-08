import Joi from "joi";

export const CreateProjectSchema = Joi.object({
  name: Joi.string().min(3).max(12).required(),
  invited: Joi.array().items(Joi.string().email()),
}).required();

export const DeleteProjectSchema = Joi.string().uuid().required();

export const UpdateProjectSchema = Joi.object({
  id: Joi.string().uuid().required(),
  name: Joi.string().min(3).max(12).required(),
}).required();
