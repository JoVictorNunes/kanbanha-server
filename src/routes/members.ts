import express from "express";
import MemberController from "@/modules/members/MemberController";

const memberRouter = express.Router();
const memberController = new MemberController();

memberRouter.post("/signIn", memberController.signIn);
memberRouter.post("/signUp", memberController.signUp);
memberRouter.get("/checkAuth", memberController.checkAuth);
memberRouter.delete("/account", memberController.delete);

export default memberRouter;
