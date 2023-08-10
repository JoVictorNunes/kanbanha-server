import Joi from "joi";

const signUpDTO = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required(),
  name: Joi.string().min(3).max(50).required(),
  role: Joi.string().min(3).max(20),
});

export default signUpDTO;
