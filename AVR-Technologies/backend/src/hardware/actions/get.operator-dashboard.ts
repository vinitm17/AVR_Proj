import { Router } from "express";
import { Response } from "express";
import { PrismaClient } from "@prisma/client";
import { verifyJWT, userReq } from "../../middleware/auth.middleware";

export const getOperatorDashboardRouter = Router()
const prisma = new PrismaClient()

// This endpoint will only work for Operator role users
getOperatorDashboardRouter.get("/operator-dashboard", verifyJWT, async (req: userReq, res: Response) => {
    try {
        const userId = req.id;
        const userRole = req.role;
        
        if (!userId) {
            return res.status(401).json({
                msg: "User not authenticated"
            });
        }

        // Check if the user has Operator role
        if (userRole !== "Operator") {
            return res.status(403).json({
                msg: "Access denied. Only Operators can access this dashboard."
            });
        }

        // Get the stations operated by this operator
        const operatedStations = await prisma.chargingStation.findMany({
            where: {
                operatorId: userId
            },
            select: {
                id: true,
                location: true,
                totalEnergyConsumption: true,
                healthPercentage: true,
                isOccupied: true,
                isActive: true,
                isFaulty: true,
                session: {
                    select: {
                        id: true,
                        createdAt: true,
                        totalTime: true,
                        pointsUsed: true,
                        energyConsumption: true,
                        User: {
                            select: {
                                firstName: true,
                                lastName: true,
                                email: true
                            }
                        }
                    },
                    orderBy: {
                        createdAt: 'desc'
                    },
                    take: 10 // Get only the 10 most recent sessions
                }
            }
        });

        // Calculate revenue metrics (using a simplified calculation)
        const totalSessions = await prisma.sessions.count({
            where: {
                stationId: {
                    in: operatedStations.map(station => station.id)
                }
            }
        });

        const totalPoints = await prisma.sessions.aggregate({
            where: {
                stationId: {
                    in: operatedStations.map(station => station.id)
                }
            },
            _sum: {
                pointsUsed: true
            }
        });

        // Basic dashboard data
        const operatorDashboardData = {
            stationsOperated: operatedStations.length,
            totalSessions: totalSessions,
            totalPoints: totalPoints._sum.pointsUsed ? totalPoints._sum.pointsUsed.toString() : "0",
            stations: operatedStations.map(station => ({
                id: station.id,
                location: station.location,
                totalEnergyConsumption: station.totalEnergyConsumption.toString(),
                healthPercentage: station.healthPercentage,
                isOccupied: station.isOccupied,
                isActive: station.isActive,
                isFaulty: station.isFaulty,
                recentSessions: station.session.map(session => ({
                    id: session.id,
                    date: session.createdAt,
                    duration: session.totalTime,
                    pointsUsed: session.pointsUsed.toString(),
                    energyConsumption: session.energyConsumption,
                    user: `${session.User.firstName} ${session.User.lastName}`
                }))
            }))
        };

        return res.json({
            msg: "Operator dashboard data retrieved successfully",
            data: operatorDashboardData
        });

    } catch (e) {
        console.error("Error fetching operator dashboard data: " + e);
        return res.status(500).json({
            msg: "Internal server error"
        });
    }
});