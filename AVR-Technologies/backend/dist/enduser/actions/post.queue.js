"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.postQueueRouter = void 0;
const express_1 = require("express");
const client_1 = require("@prisma/client");
const auth_middleware_1 = require("../../middleware/auth.middleware");
const station_state_1 = require("./station-state");
exports.postQueueRouter = (0, express_1.Router)();
const prisma = new client_1.PrismaClient();
// Join queue for a station
exports.postQueueRouter.post("/joinQueue", auth_middleware_1.verifyJWT, async (req, res) => {
    try {
        const userId = req.id;
        const { CID } = req.body;
        if (!userId) {
            return res.status(401).json({ msg: "User not authenticated" });
        }
        if (!CID) {
            return res.status(400).json({ msg: "Station ID (CID) is required" });
        }
        await (0, station_state_1.reconcileChargingState)(prisma, CID);
        const station = await prisma.chargingStation.findUnique({
            where: { id: CID }
        });
        if (!station) {
            return res.status(404).json({ msg: "Station not found" });
        }
        const activeQueue = await prisma.stationQueue.findMany({
            where: {
                stationId: CID,
                ...station_state_1.activeQueueWhere
            },
            orderBy: { position: 'asc' }
        });
        if (!station.isOccupied && activeQueue.length === 0) {
            return res.status(400).json({
                msg: "Station is available. You can start charging directly without joining the queue."
            });
        }
        // Check if user is already in queue for this station
        const existingEntry = await prisma.stationQueue.findUnique({
            where: {
                stationId_userId: {
                    stationId: CID,
                    userId: userId
                }
            }
        });
        if (existingEntry && (existingEntry.status === "WAITING" || existingEntry.status === "NOTIFIED")) {
            return res.status(400).json({
                msg: existingEntry.status === "NOTIFIED"
                    ? "It's your turn. The station is available for you now."
                    : `You are already in the queue at position #${existingEntry.position}`,
                position: existingEntry.position,
                status: existingEntry.status
            });
        }
        // If user had a cancelled entry, remove it first
        if (existingEntry) {
            await prisma.stationQueue.delete({
                where: { id: existingEntry.id }
            });
        }
        // Get current max position for this station
        const maxPosition = await prisma.stationQueue.aggregate({
            where: {
                stationId: CID,
                ...station_state_1.activeQueueWhere
            },
            _max: { position: true }
        });
        const newPosition = (maxPosition._max.position || 0) + 1;
        const queueEntry = await prisma.stationQueue.create({
            data: {
                stationId: CID,
                userId: userId,
                position: newPosition,
                status: "WAITING"
            }
        });
        // Get active session for estimated wait time
        const activeSession = await prisma.sessions.findFirst({
            where: {
                stationId: CID,
                isActive: true
            },
            orderBy: { createdAt: 'desc' }
        });
        let estimatedWaitMinutes = null;
        if (activeSession?.estimatedDuration) {
            const elapsed = Math.floor((Date.now() - activeSession.createdAt.getTime()) / 60000);
            const stationFreeIn = Math.max(0, activeSession.estimatedDuration - elapsed);
            // Each person ahead adds ~15 min average (rough estimate)
            estimatedWaitMinutes = stationFreeIn + (newPosition - 1) * 15;
        }
        return res.json({
            msg: `You joined the queue at position #${newPosition}`,
            queue: {
                id: queueEntry.id,
                position: newPosition,
                stationId: CID,
                estimatedWaitMinutes
            }
        });
    }
    catch (e) {
        console.error("Error joining queue: " + e);
        return res.status(500).json({ msg: "Internal server error" });
    }
});
// Leave queue for a station
exports.postQueueRouter.post("/leaveQueue", auth_middleware_1.verifyJWT, async (req, res) => {
    try {
        const userId = req.id;
        const { CID } = req.body;
        if (!userId) {
            return res.status(401).json({ msg: "User not authenticated" });
        }
        if (!CID) {
            return res.status(400).json({ msg: "Station ID (CID) is required" });
        }
        await (0, station_state_1.reconcileChargingState)(prisma, CID);
        const queueEntry = await prisma.stationQueue.findUnique({
            where: {
                stationId_userId: {
                    stationId: CID,
                    userId: userId
                }
            }
        });
        if (!queueEntry || queueEntry.status === "CANCELLED") {
            return res.status(404).json({ msg: "You are not in the queue for this station" });
        }
        // Delete the entry
        await prisma.stationQueue.delete({
            where: { id: queueEntry.id }
        });
        // Recalculate positions for remaining queue members
        const remainingQueue = await prisma.stationQueue.findMany({
            where: {
                stationId: CID,
                ...station_state_1.activeQueueWhere
            },
            orderBy: { position: 'asc' }
        });
        for (let i = 0; i < remainingQueue.length; i++) {
            await prisma.stationQueue.update({
                where: { id: remainingQueue[i].id },
                data: { position: i + 1 }
            });
        }
        // If position 1 was removed and there are still people in queue, 
        // notify the new position 1
        if (queueEntry.position === 1 && remainingQueue.length > 0) {
            await prisma.stationQueue.update({
                where: { id: remainingQueue[0].id },
                data: { status: "NOTIFIED" }
            });
        }
        return res.json({
            msg: "You have left the queue successfully",
            removedPosition: queueEntry.position,
            remainingInQueue: remainingQueue.length
        });
    }
    catch (e) {
        console.error("Error leaving queue: " + e);
        return res.status(500).json({ msg: "Internal server error" });
    }
});
