"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.userRouter = void 0;
const express_1 = require("express");
const post_user_1 = require("./actions/post.user");
const get_stations_1 = require("./actions/get.stations");
const get_history_1 = require("./actions/get.history");
const get_dashboard_1 = require("./actions/get.dashboard");
const post_queue_1 = require("./actions/post.queue");
exports.userRouter = (0, express_1.Router)();
// userRouter.use("/read", userRouter) //change to readUserRouter and so
exports.userRouter.use("/post", post_user_1.postUserRouter);
exports.userRouter.use("/post", post_queue_1.postQueueRouter);
exports.userRouter.use("/get", get_stations_1.getStationsRouter);
exports.userRouter.use("/get", get_history_1.getHistoryRouter);
exports.userRouter.use("/get", get_dashboard_1.getUserDashboardRouter);
