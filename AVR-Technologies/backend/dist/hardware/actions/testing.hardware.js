"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const hwRouter = (0, express_1.Router)();
hwRouter.all("/testing", (req, res) => {
    try {
        const query = req.query;
        const data = {
            cid: query.cid,
            rid: query.rid,
            oid: query.oid,
            uid: query.uid,
            datetime: query.datetime,
            pointBalance: query.pointBalance
                ? Number(query.pointBalance)
                : undefined,
            sessionStartTime: query.sessionStartTime,
            realTimePowerConsumption: query.realTimePowerConsumption
                ? Number(query.realTimePowerConsumption)
                : undefined,
            sessionStatus: query.sessionStatus,
            sessionEndDateTime: query.sessionEndDateTime,
            totalPointsConsumed: query.totalPointsConsumed
                ? Number(query.totalPointsConsumed)
                : undefined,
        };
        // Validation
        if (data.sessionStatus &&
            !["start", "charging", "end"].includes(data.sessionStatus)) {
            return res.status(400).json({
                ok: false,
                message: "Invalid sessionStatus"
            });
        }
        console.log("================================");
        console.log("Received Hardware Data");
        console.log(data);
        console.log("================================");
        return res.status(200).json({
            ok: true,
            message: "Data received successfully",
            data
        });
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({
            ok: false,
            message: "Internal Server Error"
        });
    }
});
exports.default = hwRouter;
