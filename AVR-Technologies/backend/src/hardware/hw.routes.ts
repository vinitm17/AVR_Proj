import { Router } from "express";
import testingRouter from "./actions/testing.hardware";
import { postHwRouter } from "./actions/post.hw";

export const hwRouter = Router();

hwRouter.use(testingRouter);
hwRouter.use(postHwRouter);