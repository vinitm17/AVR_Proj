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
exports.postHwRouter = void 0;
const express_1 = require("express");
const client_1 = require("@prisma/client");
const auth_middleware_1 = require("../../middleware/auth.middleware");
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
