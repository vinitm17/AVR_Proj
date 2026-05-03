import { Router } from "express";
import { Response } from "express";
import { PrismaClient } from "@prisma/client";
import Jwt from "jsonwebtoken";
import * as dotenv from "dotenv";

dotenv.config();
const SECRET = process.env.SECRET;

export const getStationsRouter = Router()
const prisma = new PrismaClient()

getStationsRouter.get("/stations", async (req, res: Response) => {
    try {
        // Optional auth - extract userId if token is present
        let currentUserId: number | null = null;
        const auth = req.headers.authorization || req.headers.Authorization;
        if (auth && typeof auth === "string" && auth.startsWith("Bearer ") && SECRET) {
            try {
                const token = auth.split(" ")[1];
                const decoded = Jwt.verify(token, SECRET) as { id: number };
                currentUserId = decoded.id;
            } catch { /* ignore invalid tokens */ }
        }

        const stations = await prisma.chargingStation.findMany({
            include: {
                OEM: {
                    select: {
                        firstName: true,
                        lastName: true
                    }
                },
                reseller: {
                    select: {
                        firstName: true,
                        lastName: true
                    }
                },
                operator: {
                    select: {
                        firstName: true,
                        lastName: true
                    }
                },
                connectedUser: {
                    select: {
                        firstName: true,
                        lastName: true
                    }
                },
                session: {
                    where: { isActive: true },
                    select: {
                        id: true,
                        createdAt: true,
                        estimatedDuration: true,
                        userId: true
                    },
                    orderBy: { createdAt: 'desc' },
                    take: 1
                },
                queue: {
                    where: { status: { in: ["WAITING", "NOTIFIED"] } },
                    select: {
                        id: true,
                        userId: true,
                        position: true,
                        status: true,
                        createdAt: true
                    },
                    orderBy: { position: 'asc' }
                }
            }
        })

        const now = new Date();

        const formattedStations = stations.map(station => {
            const activeSession = station.session[0] || null;
            let activeSessionInfo = null;

            if (activeSession && station.isOccupied) {
                const startTime = new Date(activeSession.createdAt);
                const elapsedMs = now.getTime() - startTime.getTime();
                const elapsedMinutes = Math.floor(elapsedMs / 60000);

                let minutesRemaining: number | null = null;
                let estimatedFreeAt: string | null = null;

                if (activeSession.estimatedDuration) {
                    minutesRemaining = Math.max(0, activeSession.estimatedDuration - elapsedMinutes);
                    const freeAt = new Date(startTime.getTime() + activeSession.estimatedDuration * 60000);
                    estimatedFreeAt = freeAt.toISOString();
                }

                activeSessionInfo = {
                    startTime: activeSession.createdAt,
                    estimatedDuration: activeSession.estimatedDuration,
                    elapsedMinutes,
                    minutesRemaining,
                    estimatedFreeAt
                };
            }

            // Queue info
            const waitingQueue = station.queue.filter(q => q.status === "WAITING" || q.status === "NOTIFIED");
            const userQueueEntry = currentUserId 
                ? waitingQueue.find(q => q.userId === currentUserId) 
                : null;

            return {
                id: station.id,
                location: station.location,
                healthPercentage: station.healthPercentage,
                isOccupied: station.isOccupied,
                isActive: station.isActive,
                isFaulty: station.isFaulty,
                totalEnergyConsumption: station.totalEnergyConsumption.toString(),
                oem: `${station.OEM.firstName} ${station.OEM.lastName}`,
                reseller: `${station.reseller.firstName} ${station.reseller.lastName}`,
                operator: `${station.operator.firstName} ${station.operator.lastName}`,
                connectedUser: station.connectedUser 
                    ? `${station.connectedUser.firstName} ${station.connectedUser.lastName}` 
                    : null,
                activeSession: activeSessionInfo,
                isCurrentUserCharging: currentUserId !== null && station.isOccupied && activeSession?.userId === currentUserId,
                queue: {
                    count: waitingQueue.length,
                    userPosition: userQueueEntry?.position || null,
                    userStatus: userQueueEntry?.status || null
                }
            };
        })

        return res.json({
            msg: "Stations retrieved successfully",
            stations: formattedStations
        })

    } catch (e) {
        console.error("Error fetching stations: " + e)
        return res.status(500).json({
            msg: "Internal server error"
        })
    }
})
