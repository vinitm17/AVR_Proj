import { Router } from "express";
import { Response } from "express";
import { PrismaClient } from "@prisma/client";
import { verifyJWT, userReq } from "../../middleware/auth.middleware";

export const getUserDashboardRouter = Router()
const prisma = new PrismaClient()

getUserDashboardRouter.get("/dashboard", verifyJWT, async (req: userReq, res: Response) => {
    try {
        const userId = req.id;
        
        if (!userId) {
            return res.status(401).json({
                msg: "User not authenticated"
            })
        }

        // Get user basic info
        const user = await prisma.user.findUnique({
            where: {
                id: userId
            },
            select: {
                firstName: true,
                lastName: true,
                email: true,
                points: true,
                role: true
            }
        })

        if (!user) {
            return res.status(404).json({
                msg: "User not found"
            })
        }

        // Get user sessions count
        const totalSessions = await prisma.sessions.count({
            where: {
                userId: userId
            }
        })

        // Get unique stations used by user
        const uniqueStations = await prisma.sessions.findMany({
            where: {
                userId: userId
            },
            select: {
                stationId: true
            },
            distinct: ['stationId']
        })

        const dashboardData = {
            userName: `${user.firstName} ${user.lastName}`,
            email: user.email,
            totalPoints: user.points ? user.points.toString() : "0", // Convert BigInt to string
            totalSessions: totalSessions,
            stationsUsed: uniqueStations.length,
            role: user.role
        }

        return res.json({
            msg: "Dashboard data retrieved successfully",
            data: dashboardData
        })

    } catch (e) {
        console.error("Error fetching dashboard data: " + e)
        return res.status(500).json({
            msg: "Internal server error"
        })
    }
})
