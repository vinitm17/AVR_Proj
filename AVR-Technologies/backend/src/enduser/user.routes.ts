import { Router } from "express";
import { postUserRouter } from "./actions/post.user";
import { getStationsRouter } from "./actions/get.stations";
import { getHistoryRouter } from "./actions/get.history";
import { getUserDashboardRouter } from "./actions/get.dashboard";
import { postQueueRouter } from "./actions/post.queue";

export const userRouter = Router() 
// userRouter.use("/read", userRouter) //change to readUserRouter and so
userRouter.use("/post", postUserRouter)
userRouter.use("/post", postQueueRouter)
userRouter.use("/get", getStationsRouter)
userRouter.use("/get", getHistoryRouter)
userRouter.use("/get", getUserDashboardRouter)
