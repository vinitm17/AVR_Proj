"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getOperatorDashboardRouter = void 0;
const express_1 = require("express");
const client_1 = require("@prisma/client");
const auth_middleware_1 = require("../../middleware/auth.middleware");
exports.getOperatorDashboardRouter = (0, express_1.Router)();
const prisma = new client_1.PrismaClient();
// This endpoint will only work for Operator role users
exports.getOperatorDashboardRouter.get("/operator-dashboard", auth_middleware_1.verifyJWT, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
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
        const operatedStations = yield prisma.chargingStation.findMany({
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
        const totalSessions = yield prisma.sessions.count({
            where: {
                stationId: {
                    in: operatedStations.map(station => station.id)
                }
            }
        });
        const totalPoints = yield prisma.sessions.aggregate({
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
    }
    catch (e) {
        console.error("Error fetching operator dashboard data: " + e);
        return res.status(500).json({
            msg: "Internal server error"
        });
    }
}));
