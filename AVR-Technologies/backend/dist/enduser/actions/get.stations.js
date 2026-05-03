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
exports.getStationsRouter = void 0;
const express_1 = require("express");
const client_1 = require("@prisma/client");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const dotenv = __importStar(require("dotenv"));
dotenv.config();
const SECRET = process.env.SECRET;
exports.getStationsRouter = (0, express_1.Router)();
const prisma = new client_1.PrismaClient();
exports.getStationsRouter.get("/stations", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Optional auth - extract userId if token is present
        let currentUserId = null;
        const auth = req.headers.authorization || req.headers.Authorization;
        if (auth && typeof auth === "string" && auth.startsWith("Bearer ") && SECRET) {
            try {
                const token = auth.split(" ")[1];
                const decoded = jsonwebtoken_1.default.verify(token, SECRET);
                currentUserId = decoded.id;
            }
            catch ( /* ignore invalid tokens */_a) { /* ignore invalid tokens */ }
        }
        const stations = yield prisma.chargingStation.findMany({
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
        });
        const now = new Date();
        const formattedStations = stations.map(station => {
            const activeSession = station.session[0] || null;
            let activeSessionInfo = null;
            if (activeSession && station.isOccupied) {
                const startTime = new Date(activeSession.createdAt);
                const elapsedMs = now.getTime() - startTime.getTime();
                const elapsedMinutes = Math.floor(elapsedMs / 60000);
                let minutesRemaining = null;
                let estimatedFreeAt = null;
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
                latitude: station.latitude,
                longitude: station.longitude,
                mapIframe: station.mapIframe,
                totalEnergyConsumption: station.totalEnergyConsumption.toString(),
                oem: `${station.OEM.firstName} ${station.OEM.lastName}`,
                reseller: `${station.reseller.firstName} ${station.reseller.lastName}`,
                operator: `${station.operator.firstName} ${station.operator.lastName}`,
                connectedUser: station.connectedUser
                    ? `${station.connectedUser.firstName} ${station.connectedUser.lastName}`
                    : null,
                activeSession: activeSessionInfo,
                isCurrentUserCharging: currentUserId !== null && station.isOccupied && (activeSession === null || activeSession === void 0 ? void 0 : activeSession.userId) === currentUserId,
                queue: {
                    count: waitingQueue.length,
                    userPosition: (userQueueEntry === null || userQueueEntry === void 0 ? void 0 : userQueueEntry.position) || null,
                    userStatus: (userQueueEntry === null || userQueueEntry === void 0 ? void 0 : userQueueEntry.status) || null
                }
            };
        });
        return res.json({
            msg: "Stations retrieved successfully",
            stations: formattedStations
        });
    }
    catch (e) {
        console.error("Error fetching stations: " + e);
        return res.status(500).json({
            msg: "Internal server error"
        });
    }
}));
