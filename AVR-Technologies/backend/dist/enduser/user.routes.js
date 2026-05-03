"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.userRouter = void 0;
const express_1 = require("express");
const post_user_1 = require("./actions/post.user");
exports.userRouter = (0, express_1.Router)();
// userRouter.use("/read", userRouter) //change to readUserRouter and so
exports.userRouter.use("/post", post_user_1.postUserRouter);
