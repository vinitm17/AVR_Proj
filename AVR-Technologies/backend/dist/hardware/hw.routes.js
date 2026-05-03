"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.hwRouter = void 0;
const express_1 = require("express");
const get_operator_dashboard_1 = require("./actions/get.operator-dashboard");
exports.hwRouter = (0, express_1.Router)();
exports.hwRouter.use("/get", get_operator_dashboard_1.getOperatorDashboardRouter);
