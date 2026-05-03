import { Router } from "express";
import { Response } from "express";
import { PrismaClient } from "@prisma/client";
import { verifyJWT, userReq } from "../../middleware/auth.middleware";

export const getHistoryRouter = Router()
const prisma = new PrismaClient()

getHistoryRouter.get("/history", verifyJWT, async (req: userReq, res: Response) => {
    try {
        const userId = req.id;
        
        if (!userId) {
            return res.status(401).json({
                msg: "User not authenticated"
            })
        }

        const userSessions = await prisma.sessions.findMany({
            where: {
                userId: userId
            },
            include: {
                chargingStation: {
                    include: {
                        operator: {
                            select: {
                                firstName: true,
                                lastName: true
                            }
                        },
                        OEM: {
                            select: {
                                firstName: true,
                                lastName: true
                            }
                        }
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        })

        const formattedHistory = userSessions.map(session => ({
            sessionId: session.id,
            stationId: session.chargingStation.id,
            location: session.location,
            stationLocation: session.chargingStation.location,
            createdAt: session.createdAt,
            totalTime: session.totalTime,
            isActive: session.isActive,
            pointsUsed: session.pointsUsed.toString(), // Convert BigInt to string
            energyConsumption: session.energyConsumption,
            transactionID: session.transactionID,
            operator: `${session.chargingStation.operator.firstName} ${session.chargingStation.operator.lastName}`,
            oem: `${session.chargingStation.OEM.firstName} ${session.chargingStation.OEM.lastName}`,
            stationHealth: session.chargingStation.healthPercentage,
            stationStatus: {
                isOccupied: session.chargingStation.isOccupied,
                isActive: session.chargingStation.isActive,
                isFaulty: session.chargingStation.isFaulty
            }
        }))

        return res.json({
            msg: "History retrieved successfully",
            sessions: formattedHistory,
            totalSessions: formattedHistory.length,
            activeSessions: formattedHistory.filter(s => s.isActive).length
        })

    } catch (e) {
        console.error("Error fetching user history: " + e)
        return res.status(500).json({
            msg: "Internal server error"
        })
    }
})
