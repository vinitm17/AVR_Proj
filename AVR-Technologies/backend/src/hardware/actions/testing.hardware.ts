import { Router, Request, Response } from "express";

const hwRouter = Router();

type SessionStatus = "start" | "charging" | "end";

interface HardwarePayload {
    cid?: string;
    rid?: string;
    oid?: string;
    uid?: string;

    datetime?: string;

    pointBalance?: number;

    sessionStartTime?: string;

    realTimePowerConsumption?: number;

    sessionStatus?: SessionStatus;

    sessionEndDateTime?: string;

    totalPointsConsumed?: number;
}

hwRouter.all("/testing", (req: Request, res: Response) => {
    try {

        const query = req.query;

        const data: HardwarePayload = {
            cid: query.cid as string | undefined,
            rid: query.rid as string | undefined,
            oid: query.oid as string | undefined,
            uid: query.uid as string | undefined,

            datetime: query.datetime as string | undefined,

            pointBalance: query.pointBalance
                ? Number(query.pointBalance)
                : undefined,

            sessionStartTime: query.sessionStartTime as string | undefined,

            realTimePowerConsumption: query.realTimePowerConsumption
                ? Number(query.realTimePowerConsumption)
                : undefined,

            sessionStatus: query.sessionStatus as SessionStatus | undefined,

            sessionEndDateTime: query.sessionEndDateTime as string | undefined,

            totalPointsConsumed: query.totalPointsConsumed
                ? Number(query.totalPointsConsumed)
                : undefined,
        };

        // Validation

        if (
            data.sessionStatus &&
            !["start", "charging", "end"].includes(data.sessionStatus)
        ) {
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

    } catch (error) {

        console.error(error);

        return res.status(500).json({
            ok: false,
            message: "Internal Server Error"
        });
    }
});

export default hwRouter;