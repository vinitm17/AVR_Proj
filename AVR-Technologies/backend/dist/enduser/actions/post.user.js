"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.postUserRouter = void 0;
const express_1 = __importDefault(require("express"));
const auth_middleware_1 = require("../../middleware/auth.middleware");
const client_1 = require("@prisma/client");
const dotenv = __importStar(require("dotenv"));
const station_state_1 = require("./station-state");
const post_hw_1 = require("../../hardware/actions/post.hw");
dotenv.config();
const MINS_PER_POINT = parseInt(process.env.MINS_PER_POINT || "5", 10);
const MAX_SESSION_MINUTES = 480;
exports.postUserRouter = (0, express_1.default)();
const prisma = new client_1.PrismaClient();
exports.postUserRouter.post("/scanQR", auth_middleware_1.verifyJWT, async (req, res) => {
    try {
        const { CID } = req.body;
        const userId = req.id;
        if (!userId) {
            return res.status(401).json({
                msg: "User not authenticated"
            });
        }
        await (0, station_state_1.reconcileChargingState)(prisma, CID);
        const chargingStation = await prisma.chargingStation.findUnique({
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
        const user = await prisma.user.findUnique({
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
                points: user.points?.toString(),
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
});
exports.postUserRouter.post("/startCharging", auth_middleware_1.verifyJWT, async (req, res) => {
    try {
        const { CID, points } = req.body;
        const userId = req.id;
        const customPoints = points ? BigInt(points) : undefined;
        if (!userId) {
            return res.status(401).json({
                msg: "User not authenticated"
            });
        }
        // Per-station reconcile only — reconciling all stations is O(N) and causes Axios timeouts
        await (0, station_state_1.reconcileChargingState)(prisma, CID);
        const [user, station] = await Promise.all([
            prisma.user.findUnique({ where: { id: userId } }),
            prisma.chargingStation.findUnique({ where: { id: CID } })
        ]);
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
        // Check if user has enough points for custom amount
        if (customPoints && (user.points < customPoints)) {
            return res.status(400).json({
                msg: "Insufficient coins for requested charging amount"
            });
        }
        const existingActiveSession = await prisma.sessions.findFirst({
            where: {
                userId,
                isActive: true
            },
            select: {
                stationId: true
            },
            orderBy: {
                createdAt: 'desc'
            }
        });
        if (existingActiveSession) {
            return res.status(400).json({
                msg: `You already have an active charging session at station #${existingActiveSession.stationId}. Stop it before starting another one.`
            });
        }
        if (station.isOccupied || !station.isActive || station.isFaulty) {
            return res.status(400).json({
                msg: "Station is not available for charging"
            });
        }
        // Check queue - if there's a queue, only position 1 can start
        const queueEntries = await prisma.stationQueue.findMany({
            where: {
                stationId: CID,
                ...station_state_1.activeQueueWhere
            },
            orderBy: { position: 'asc' }
        });
        if (queueEntries.length > 0) {
            const firstInQueue = queueEntries[0];
            if (firstInQueue.userId !== userId) {
                const userQueueEntry = queueEntries.find(q => q.userId === userId);
                return res.status(400).json({
                    msg: userQueueEntry
                        ? `You are position #${userQueueEntry.position} in queue. Only position #1 can start charging.`
                        : "Other users are queued for this station. Please join the queue first.",
                    queuePosition: userQueueEntry?.position || null
                });
            }
        }
        const estimatedDuration = customPoints ? Number(customPoints) * MINS_PER_POINT : null;
        if (estimatedDuration && estimatedDuration > MAX_SESSION_MINUTES) {
            return res.status(400).json({
                msg: `Session duration cannot exceed ${MAX_SESSION_MINUTES} minutes. Please use fewer points.`,
                maxAllowedPoints: Math.floor(MAX_SESSION_MINUTES / MINS_PER_POINT)
            });
        }
        // Atomic claim + session create in one transaction — prevents two users
        // from grabbing the same station if they both click at the same moment
        const { newSession } = await prisma.$transaction(async (tx) => {
            const claimed = await tx.chargingStation.updateMany({
                where: { id: CID, isOccupied: false, isActive: true, isFaulty: false },
                data: { isOccupied: true, connectedUserID: userId }
            });
            if (claimed.count === 0) {
                throw Object.assign(new Error("Station was just taken by another user"), { code: "STATION_TAKEN" });
            }
            const newSession = await tx.sessions.create({
                data: {
                    userId: userId,
                    stationId: CID,
                    totalTime: "0",
                    isActive: true,
                    location: station.location,
                    pointsUsed: customPoints ? customPoints : BigInt(0),
                    estimatedDuration: estimatedDuration
                }
            });
            if (customPoints) {
                await tx.user.update({
                    where: { id: userId },
                    data: { points: user.points - customPoints }
                });
            }
            return { newSession };
        });
        // Remove user from queue if they were in it
        await prisma.stationQueue.deleteMany({
            where: {
                stationId: CID,
                userId: userId
            }
        });
        // Recalculate queue positions
        const remainingQueue = await prisma.stationQueue.findMany({
            where: { stationId: CID, ...station_state_1.activeQueueWhere },
            orderBy: { position: 'asc' }
        });
        for (let i = 0; i < remainingQueue.length; i++) {
            await prisma.stationQueue.update({
                where: { id: remainingQueue[i].id },
                data: { position: i + 1, status: "WAITING" }
            });
        }
        res.json({
            msg: "Charging session started successfully",
            session: {
                id: newSession.id,
                stationId: newSession.stationId,
                location: newSession.location,
                startTime: newSession.createdAt,
                pointsAllocated: customPoints ? customPoints.toString() : null
            }
        });
        (0, post_hw_1.notifyHardware)('start', CID).catch(() => { });
    }
    catch (e) {
        if (e?.code === "STATION_TAKEN") {
            return res.status(400).json({ msg: "Station was just taken by another user. Please try again." });
        }
        console.error("error starting charging session: " + e);
        res.status(500).json({
            msg: "Failed to start charging session"
        });
    }
});
exports.postUserRouter.post("/addPoints", auth_middleware_1.verifyJWT, async (req, res) => {
    try {
        const userId = req.id;
        const { points } = req.body;
        const pointsToAdd = Number(points);
        if (!userId) {
            return res.status(401).json({ msg: "User not authenticated" });
        }
        if (!Number.isInteger(pointsToAdd) || pointsToAdd <= 0) {
            return res.status(400).json({ msg: "Enter a valid points amount" });
        }
        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: {
                points: {
                    increment: BigInt(pointsToAdd)
                }
            },
            select: {
                points: true
            }
        });
        return res.json({
            msg: "Points added successfully",
            points: updatedUser.points ? updatedUser.points.toString() : "0"
        });
    }
    catch (e) {
        console.error("Error adding points: ", e);
        return res.status(500).json({
            msg: "Failed to add points"
        });
    }
});
exports.postUserRouter.post("/stopCharging", auth_middleware_1.verifyJWT, async (req, res) => {
    try {
        const userId = req.id;
        const { CID } = req.body;
        if (!userId) {
            return res.status(401).json({ msg: "User not authenticated" });
        }
        const session = await prisma.sessions.findFirst({
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
        const station = await prisma.chargingStation.findUnique({
            where: { id: CID }
        });
        if (!station) {
            return res.status(404).json({ msg: "Station not found" });
        }
        const startTime = session.createdAt;
        const endTime = new Date();
        const totalMs = endTime.getTime() - startTime.getTime();
        const totalMinutes = Math.max(1, Math.ceil(totalMs / 60000));
        // If user has already paid for this session (using custom points),
        // we don't need to deduct points again
        if (session.pointsUsed > BigInt(0)) {
            // Session already has points allocated, just mark it as complete
            await prisma.$transaction([
                prisma.sessions.update({
                    where: { id: session.id },
                    data: {
                        isActive: false,
                        totalTime: `${totalMinutes} min`,
                    }
                }),
                prisma.chargingStation.update({
                    where: { id: CID },
                    data: {
                        isOccupied: false,
                        connectedUserID: null
                    }
                })
            ]);
            // Notify first person in queue
            await prisma.stationQueue.updateMany({
                where: {
                    stationId: CID,
                    status: "WAITING",
                    position: 1
                },
                data: {
                    status: "NOTIFIED"
                }
            });
            (0, post_hw_1.notifyHardware)('stop', CID).catch(() => { });
            res.json({
                msg: "Charging session stopped successfully",
                sessionId: session.id,
                totalTime: `${totalMinutes} min`,
                coinsUsed: session.pointsUsed.toString()
            });
            return;
        }
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user || !user.points) {
            return res.status(400).json({ msg: "User not found or has no points" });
        }
        // Calculate coins to be deducted (minimum 1 coin for any charging session)
        const coinsUsed = BigInt(Math.max(1, Math.ceil(totalMinutes / MINS_PER_POINT)));
        // Check if user has sufficient points, if not, use all remaining points
        const actualCoinsUsed = user.points >= coinsUsed ? coinsUsed : user.points;
        await prisma.$transaction([
            prisma.sessions.update({
                where: { id: session.id },
                data: {
                    isActive: false,
                    totalTime: `${totalMinutes} min`,
                    pointsUsed: actualCoinsUsed
                }
            }),
            prisma.chargingStation.update({
                where: { id: CID },
                data: {
                    isOccupied: false,
                    connectedUserID: null
                }
            }),
            prisma.user.update({
                where: { id: userId },
                data: {
                    points: user.points - actualCoinsUsed
                }
            })
        ]);
        // Notify first person in queue
        await prisma.stationQueue.updateMany({
            where: {
                stationId: CID,
                status: "WAITING",
                position: 1
            },
            data: {
                status: "NOTIFIED"
            }
        });
        (0, post_hw_1.notifyHardware)('stop', CID).catch(() => { });
        res.json({
            msg: "Charging session stopped successfully",
            sessionId: session.id,
            totalTime: `${totalMinutes} min`,
            coinsUsed: actualCoinsUsed.toString()
        });
    }
    catch (e) {
        console.error("Error stopping charging session: ", e);
        res.status(500).json({
            msg: "Failed to stop charging session"
        });
    }
});
