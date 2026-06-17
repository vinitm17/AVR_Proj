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
const station_state_1 = require("./station-state");
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
                    where: station_state_1.activeQueueWhere,
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
        let needsReconcile = false;
        const formattedStations = stations.map(station => {
            var _a;
            const rawSession = (_a = station.session[0]) !== null && _a !== void 0 ? _a : null;
            // Virtual expiry: treat expired sessions as free without a DB write
            const sessionExpired = (rawSession === null || rawSession === void 0 ? void 0 : rawSession.estimatedDuration) != null &&
                Math.floor((now.getTime() - new Date(rawSession.createdAt).getTime()) / 60000) >= rawSession.estimatedDuration;
            if (sessionExpired)
                needsReconcile = true;
            const effectiveSession = sessionExpired ? null : rawSession;
            const isOccupied = Boolean(effectiveSession);
            let activeSessionInfo = null;
            if (effectiveSession) {
                const startTime = new Date(effectiveSession.createdAt);
                const elapsedMs = now.getTime() - startTime.getTime();
                const elapsedMinutes = Math.floor(elapsedMs / 60000);
                let minutesRemaining = null;
                let estimatedFreeAt = null;
                if (effectiveSession.estimatedDuration) {
                    minutesRemaining = Math.max(0, effectiveSession.estimatedDuration - elapsedMinutes);
                    estimatedFreeAt = new Date(startTime.getTime() + effectiveSession.estimatedDuration * 60000).toISOString();
                }
                activeSessionInfo = {
                    startTime: effectiveSession.createdAt,
                    estimatedDuration: effectiveSession.estimatedDuration,
                    elapsedMinutes,
                    minutesRemaining,
                    estimatedFreeAt
                };
            }
            const waitingQueue = station.queue.filter(q => q.status === "WAITING" || q.status === "NOTIFIED");
            const userQueueEntry = currentUserId
                ? waitingQueue.find(q => q.userId === currentUserId)
                : null;
            return {
                id: station.id,
                location: station.location,
                healthPercentage: station.healthPercentage,
                isOccupied,
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
                isCurrentUserCharging: currentUserId !== null && isOccupied && (effectiveSession === null || effectiveSession === void 0 ? void 0 : effectiveSession.userId) === currentUserId,
                queue: {
                    count: waitingQueue.length,
                    userPosition: (userQueueEntry === null || userQueueEntry === void 0 ? void 0 : userQueueEntry.position) || null,
                    userStatus: (userQueueEntry === null || userQueueEntry === void 0 ? void 0 : userQueueEntry.status) || null
                }
            };
        });
        // Sync stale DB state in background without blocking the response
        if (needsReconcile) {
            (0, station_state_1.reconcileChargingState)(prisma).catch(e => console.error("reconcile error:", e));
        }
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
