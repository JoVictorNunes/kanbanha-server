import Joi from "joi";

export const CreateProjectSchema = Joi.object({
  name: Joi.string().min(3).max(12).required(),
  invited: Joi.array().items(Joi.string().email()).unique(),
}).required();

export const DeleteProjectSchema = Joi.object({
  id: Joi.string().uuid().required(),
}).required();

export const UpdateProjectSchema = Joi.object({
  id: Joi.string().uuid().required(),
  name: Joi.string().min(3).max(12).required(),
}).required();
