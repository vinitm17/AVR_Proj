import { Router } from "express";
import { getOperatorDashboardRouter } from "../hardware/actions/get.operator-dashboard";
import { operatorAdminRouter } from "../hardware/actions/operator.admin";

export const operatorRouter = Router();

operatorRouter.use("/get", getOperatorDashboardRouter);
operatorRouter.use("/get", operatorAdminRouter);
operatorRouter.use("/post", operatorAdminRouter);