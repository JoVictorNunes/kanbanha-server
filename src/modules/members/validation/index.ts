import Joi from "joi";

export const CreateMemberSchema = Joi.object({
  email: Joi.string().email().required(),
  name: Joi.string().min(3).max(40).required(),
  password: Joi.string().alphanum().min(8).max(16).required(),
  role: Joi.string().min(3).max(12),
}).required();

export const UpdateMemberSchema = Joi.object({
  email: Joi.string().email().required(),
  name: Joi.string().min(3).max(40).required(),
  role: Joi.string().min(3).max(40),
}).required();

export const signInDTO = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required(),
});

export const signUpDTO = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required(),
  name: Joi.string().min(3).max(50).required(),
  role: Joi.string().min(3).max(20),
});

export const DeleteMemberSchema = Joi.object().required();
