import Joi from "joi";

export const AcceptInviteSchema = Joi.object({
  id: Joi.string().uuid().required(),
}).required();

export const CreateInviteSchema = Joi.object({
  projectId: Joi.string().uuid().required(),
  invited: Joi.array().items(Joi.string().email()).unique().required(),
}).required();
