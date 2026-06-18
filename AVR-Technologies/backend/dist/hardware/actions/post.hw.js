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
Object.defineProperty(exports, "__esModule", { value: true });
exports.postHwRouter = void 0;
exports.notifyHardware = notifyHardware;
const express_1 = require("express");
const client_1 = require("@prisma/client");
const auth_middleware_1 = require("../../middleware/auth.middleware");
const dotenv = __importStar(require("dotenv"));
dotenv.config();
// Called from startCharging / stopCharging — fire and forget, never blocks the main flow
function notifyHardware(action, stationId) {
    return __awaiter(this, void 0, void 0, function* () {
        const url = process.env.HARDWARE_API_URL;
        if (!url) {
            console.log(`[HW] HARDWARE_API_URL not set, skipping ${action} for station ${stationId}`);
            return;
        }
        const payload = {
            action,
            p1: 0, p2: 0, p3: 0, p4: 0,
            p5: 0, p6: 0, p7: 0, p8: 0,
            p9: 0, p10: 0, p11: 0, p12: 0,
        };
        try {
            const res = yield fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
                signal: AbortSignal.timeout(5000),
            });
            const data = yield res.json();
            console.log(`[HW] station ${stationId} ${action}:`, data);
        }
        catch (e) {
            console.error(`[HW] station ${stationId} ${action} failed:`, e);
        }
    });
}
exports.postHwRouter = (0, express_1.Router)();
const prisma = new client_1.PrismaClient();
exports.postHwRouter.post("/register", auth_middleware_1.verifyJWT, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.id;
        if (!userId) {
            return res.json(401).json({
                msg: "user not authenticated"
            });
        }
        const user = yield prisma.user.findUnique({
            where: {
                id: userId
            }
        });
        if (!user) {
            return res.json(401).json({
                msg: "user not authenticated"
            });
        }
        if (user.role == "Operator" || user.role == "EndUser") {
            return res.json(401).json({
                msg: "you are not allowed"
            });
        }
        //assuming they have hardware IDs for every hardware
        const { hwId } = req.body;
    }
    catch (e) {
        console.error("error found - " + e);
    }
}));
//write here the post api of 12 points p1, p2, etc
