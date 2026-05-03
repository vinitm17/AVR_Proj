import { Router } from "express";
import { getOperatorDashboardRouter } from "./actions/get.operator-dashboard";

export const hwRouter = Router()

hwRouter.use("/get", getOperatorDashboardRouter)
