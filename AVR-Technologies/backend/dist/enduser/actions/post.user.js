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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.postUserRouter = void 0;
const express_1 = __importDefault(require("express"));
const auth_middleware_1 = require("../../middleware/auth.middleware");
const client_1 = require("@prisma/client");
exports.postUserRouter = (0, express_1.default)();
const prisma = new client_1.PrismaClient();
exports.postUserRouter.post("/scanQR", auth_middleware_1.verifyJWT, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { CID } = req.body;
        const userId = req.id;
        if (!userId) {
            return res.status(401).json({
                msg: "User not authenticated"
            });
        }
        const chargingStation = yield prisma.chargingStation.findUnique({
            where: {
                id: CID
            },
        });
        if (!chargingStation) {
            return res.status(404).json({
                msg: "Charging station not found"
            });
        }
        if (chargingStation.isOccupied || !chargingStation.isActive || chargingStation.isFaulty) {
            return res.status(400).json({
                msg: "Charging station is not available",
                station: {
                    id: chargingStation.id,
                    location: chargingStation.location,
                    isOccupied: chargingStation.isOccupied,
                    isActive: chargingStation.isActive,
                    isFaulty: chargingStation.isFaulty,
                }
            });
        }
        const user = yield prisma.user.findUnique({
            where: {
                id: userId
            }
        });
        if (!user) {
            return res.status(404).json({
                msg: "User not found"
            });
        }
        res.json({
            msg: "Station scanned successfully",
            station: {
                id: chargingStation.id,
                location: chargingStation.location,
                healthPercentage: chargingStation.healthPercentage,
                totalEnergyConsumption: chargingStation.totalEnergyConsumption.toString()
            },
            user: {
                id: user.id,
                points: (_a = user.points) === null || _a === void 0 ? void 0 : _a.toString(),
                canStartCharging: user.points && user.points > 0
            }
        });
    }
    catch (e) {
        console.error("error found: " + e);
        res.status(500).json({
            msg: "Internal server error"
        });
    }
}));
exports.postUserRouter.post("/startCharging", auth_middleware_1.verifyJWT, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { CID } = req.body;
        const userId = req.id;
        if (!userId) {
            return res.status(401).json({
                msg: "User not authenticated"
            });
        }
        const user = yield prisma.user.findUnique({
            where: { id: userId }
        });
        const station = yield prisma.chargingStation.findUnique({
            where: { id: CID }
        });
        if (!user || !station) {
            return res.status(404).json({
                msg: "User or station not found"
            });
        }
        if (!user.points || user.points <= 0) {
            return res.status(400).json({
                msg: "Insufficient coins to start charging"
            });
        }
        if (station.isOccupied || !station.isActive || station.isFaulty) {
            return res.status(400).json({
                msg: "Station is not available for charging"
            });
        }
        const [updatedStation, newSession] = yield prisma.$transaction([
            prisma.chargingStation.update({
                where: { id: CID },
                data: {
                    // connectedUserID: userId,  --> showing errors, will see this later
                    isOccupied: true
                }
            }),
            prisma.sessions.create({
                data: {
                    userId: userId,
                    stationId: CID,
                    totalTime: "0", // Will be updated when session ends
                    isActive: true,
                    location: station.location,
                    pointsUsed: BigInt(0) // Will be calculated based on usage
                }
            })
        ]);
        res.json({
            msg: "Charging session started successfully",
            session: {
                id: newSession.id,
                stationId: newSession.stationId,
                location: newSession.location,
                startTime: newSession.createdAt
            }
        });
    }
    catch (e) {
        console.error("error starting charging session: " + e);
        res.status(500).json({
            msg: "Failed to start charging session"
        });
    }
}));
exports.postUserRouter.post("/stopCharging", auth_middleware_1.verifyJWT, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.id;
        const { CID } = req.body;
        if (!userId) {
            return res.status(401).json({ msg: "User not authenticated" });
        }
        const session = yield prisma.sessions.findFirst({
            where: {
                userId: userId,
                stationId: CID,
                isActive: true
            },
            orderBy: {
                createdAt: 'desc'
            }
        });
        if (!session) {
            return res.status(404).json({ msg: "No active session found for this user and station" });
        }
        const station = yield prisma.chargingStation.findUnique({
            where: { id: CID }
        });
        if (!station) {
            return res.status(404).json({ msg: "Station not found" });
        }
        const startTime = session.createdAt;
        const endTime = new Date();
        const totalMs = endTime.getTime() - startTime.getTime();
        const totalMinutes = Math.ceil(totalMs / 60000);
        const coinsUsed = BigInt(Math.ceil(totalMinutes / 5));
        const user = yield prisma.user.findUnique({ where: { id: userId } });
        if (!user || !user.points || user.points < coinsUsed) {
            return res.status(400).json({ msg: "User has insufficient points to end session" });
        }
        yield prisma.$transaction([
            prisma.sessions.update({
                where: { id: session.id },
                data: {
                    isActive: false,
                    totalTime: `${totalMinutes} min`,
                    pointsUsed: coinsUsed
                }
            }),
            prisma.chargingStation.update({
                where: { id: CID },
                data: {
                    isOccupied: false,
                }
            }),
            prisma.user.update({
                where: { id: userId },
                data: {
                    points: user.points - coinsUsed
                }
            })
        ]);
        res.json({
            msg: "Charging session stopped successfully",
            sessionId: session.id,
            totalTime: `${totalMinutes} min`,
            coinsUsed: coinsUsed.toString()
        });
    }
    catch (e) {
        console.error("Error stopping charging session: ", e);
        res.status(500).json({
            msg: "Failed to stop charging session"
        });
    }
}));
