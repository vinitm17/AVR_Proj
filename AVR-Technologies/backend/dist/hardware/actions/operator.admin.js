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
exports.operatorAdminRouter = void 0;
const express_1 = require("express");
const client_1 = require("@prisma/client");
const auth_middleware_1 = require("../../middleware/auth.middleware");
exports.operatorAdminRouter = (0, express_1.Router)();
const prisma = new client_1.PrismaClient();
const requireOperator = (req, res) => {
    if (!req.id) {
        res.status(401).json({ msg: "User not authenticated" });
        return null;
    }
    if (req.role !== client_1.Role.Operator) {
        res.status(403).json({ msg: "Access denied. Only Operators can access this resource." });
        return null;
    }
    return req.id;
};
exports.operatorAdminRouter.post("/station/add", auth_middleware_1.verifyJWT, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const operatorId = requireOperator(req, res);
        if (!operatorId)
            return;
        const { location, OEMId, resellerId, operatorId: operatorIdOverride, totalEnergyConsumption, healthPercentage, isActive, isFaulty } = req.body;
        if (!location || !OEMId || !resellerId) {
            return res.status(400).json({
                msg: "location, OEMId, and resellerId are required"
            });
        }
        const [oem, reseller] = yield Promise.all([
            prisma.user.findUnique({ where: { id: Number(OEMId) } }),
            prisma.user.findUnique({ where: { id: Number(resellerId) } })
        ]);
        if (!oem || oem.role !== client_1.Role.OEM) {
            return res.status(400).json({ msg: "OEMId must reference an OEM user" });
        }
        if (!reseller || reseller.role !== client_1.Role.Reseller) {
            return res.status(400).json({ msg: "resellerId must reference a Reseller user" });
        }
        const station = yield prisma.chargingStation.create({
            data: {
                location: String(location),
                OEMId: Number(OEMId),
                resellerId: Number(resellerId),
                operatorId: Number(operatorIdOverride || operatorId),
                totalEnergyConsumption: BigInt(totalEnergyConsumption !== null && totalEnergyConsumption !== void 0 ? totalEnergyConsumption : 0),
                healthPercentage: Number(healthPercentage !== null && healthPercentage !== void 0 ? healthPercentage : 100),
                isOccupied: false,
                isActive: Boolean(isActive !== null && isActive !== void 0 ? isActive : true),
                isFaulty: Boolean(isFaulty !== null && isFaulty !== void 0 ? isFaulty : false)
            }
        });
        return res.json({
            msg: "Station created successfully",
            stationId: station.id
        });
    }
    catch (e) {
        console.error("Error creating station: " + e);
        return res.status(500).json({ msg: "Internal server error" });
    }
}));
exports.operatorAdminRouter.post("/station/remove", auth_middleware_1.verifyJWT, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const operatorId = requireOperator(req, res);
        if (!operatorId)
            return;
        const { stationId } = req.body;
        if (!stationId) {
            return res.status(400).json({ msg: "stationId is required" });
        }
        const station = yield prisma.chargingStation.findUnique({
            where: { id: Number(stationId) }
        });
        if (!station) {
            return res.status(404).json({ msg: "Station not found" });
        }
        if (station.operatorId !== operatorId) {
            return res.status(403).json({ msg: "You can only remove stations you operate" });
        }
        yield prisma.chargingStation.delete({ where: { id: Number(stationId) } });
        return res.json({ msg: "Station removed successfully" });
    }
    catch (e) {
        console.error("Error removing station: " + e);
        return res.status(500).json({ msg: "Internal server error" });
    }
}));
exports.operatorAdminRouter.post("/station/update", auth_middleware_1.verifyJWT, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const operatorId = requireOperator(req, res);
        if (!operatorId)
            return;
        const { stationId, isActive, isFaulty, healthPercentage } = req.body;
        if (!stationId) {
            return res.status(400).json({ msg: "stationId is required" });
        }
        const station = yield prisma.chargingStation.findUnique({
            where: { id: Number(stationId) }
        });
        if (!station) {
            return res.status(404).json({ msg: "Station not found" });
        }
        if (station.operatorId !== operatorId) {
            return res.status(403).json({ msg: "You can only update stations you operate" });
        }
        const updated = yield prisma.chargingStation.update({
            where: { id: Number(stationId) },
            data: {
                isActive: typeof isActive === "boolean" ? isActive : station.isActive,
                isFaulty: typeof isFaulty === "boolean" ? isFaulty : station.isFaulty,
                healthPercentage: typeof healthPercentage === "number" ? healthPercentage : station.healthPercentage
            }
        });
        return res.json({
            msg: "Station updated successfully",
            station: {
                id: updated.id,
                isActive: updated.isActive,
                isFaulty: updated.isFaulty,
                healthPercentage: updated.healthPercentage
            }
        });
    }
    catch (e) {
        console.error("Error updating station: " + e);
        return res.status(500).json({ msg: "Internal server error" });
    }
}));
exports.operatorAdminRouter.get("/station-analytics", auth_middleware_1.verifyJWT, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const operatorId = requireOperator(req, res);
        if (!operatorId)
            return;
        const stations = yield prisma.chargingStation.findMany({
            where: { operatorId: operatorId },
            select: { id: true }
        });
        const stationIds = stations.map(s => s.id);
        if (stationIds.length === 0) {
            return res.json({
                msg: "No stations for operator",
                analytics: []
            });
        }
        const sessions = yield prisma.sessions.findMany({
            where: { stationId: { in: stationIds } },
            select: { stationId: true, pointsUsed: true, energyConsumption: true }
        });
        const totals = new Map();
        for (const stationId of stationIds) {
            totals.set(stationId, { totalPoints: 0, totalEnergy: 0, totalSessions: 0 });
        }
        for (const session of sessions) {
            const entry = totals.get(session.stationId) || { totalPoints: 0, totalEnergy: 0, totalSessions: 0 };
            entry.totalPoints += Number(session.pointsUsed || 0);
            entry.totalEnergy += Number(session.energyConsumption || 0);
            entry.totalSessions += 1;
            totals.set(session.stationId, entry);
        }
        const analytics = Array.from(totals.entries()).map(([stationId, entry]) => ({
            stationId,
            totalPoints: entry.totalPoints.toString(),
            totalEnergy: entry.totalEnergy.toFixed(2),
            totalSessions: entry.totalSessions
        }));
        return res.json({
            msg: "Station analytics retrieved successfully",
            analytics
        });
    }
    catch (e) {
        console.error("Error fetching station analytics: " + e);
        return res.status(500).json({ msg: "Internal server error" });
    }
}));
exports.operatorAdminRouter.get("/users", auth_middleware_1.verifyJWT, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const operatorId = requireOperator(req, res);
        if (!operatorId)
            return;
        const users = yield prisma.user.findMany({
            select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                role: true,
                points: true,
                session: {
                    select: {
                        pointsUsed: true
                    }
                }
            },
            orderBy: { id: "asc" }
        });
        const formatted = users.map(user => {
            const totalPointsUsed = user.session.reduce((sum, s) => sum + Number(s.pointsUsed || 0), 0);
            return {
                id: user.id,
                name: `${user.firstName} ${user.lastName}`,
                email: user.email,
                role: user.role,
                pointsBalance: user.points ? user.points.toString() : "0",
                pointsConsumed: totalPointsUsed.toString()
            };
        });
        return res.json({
            msg: "Users retrieved successfully",
            users: formatted
        });
    }
    catch (e) {
        console.error("Error fetching users: " + e);
        return res.status(500).json({ msg: "Internal server error" });
    }
}));
