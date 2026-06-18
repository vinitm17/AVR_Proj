"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.hwRouter = void 0;
const express_1 = require("express");
const testing_hardware_1 = __importDefault(require("./actions/testing.hardware"));
const post_hw_1 = require("./actions/post.hw");
exports.hwRouter = (0, express_1.Router)();
exports.hwRouter.use(testing_hardware_1.default);
exports.hwRouter.use(post_hw_1.postHwRouter);
