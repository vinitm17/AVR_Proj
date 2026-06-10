import { Router } from "express";
import testingRouter from "./actions/testing.hardware";

export const hwRouter = Router();

// Mount the testing router
hwRouter.use(testingRouter);

//qr scan, hardware integration