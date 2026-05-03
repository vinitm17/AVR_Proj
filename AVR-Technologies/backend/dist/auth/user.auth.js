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
exports.authUserRouter = void 0;
const express_1 = require("express");
const client_1 = require("@prisma/client");
exports.authUserRouter = (0, express_1.Router)();
// import bodyParser from
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const dotenv = __importStar(require("dotenv"));
const auth_middleware_1 = require("../middleware/auth.middleware");
dotenv.config();
const secret = process.env.SECRET;
const prisma = new client_1.PrismaClient;
//hidden apis for onboarding OEM, resellers
//operators onboarding apis might have to be public
exports.authUserRouter.post("/signup", auth_middleware_1.signupMiddleware, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { firstName, lastName, email, password } = req.body;
        const existingUser = yield prisma.user.findUnique({
            where: {
                email: email
            }
        });
        if (!secret) {
            console.error("JWT_SECRET not found");
            return;
        }
        if (existingUser && existingUser.lastName === lastName && existingUser.firstName === firstName && existingUser.password === password) {
            const token = jsonwebtoken_1.default.sign({
                email: email,
                id: existingUser.id,
                role: existingUser.role
            }, secret, { expiresIn: "30d" });
            res.json({
                msg: "logging you in",
                token
            });
        }
        else if (existingUser && (existingUser.lastName != lastName || existingUser.firstName != firstName || existingUser.password != password)) {
            return res.status(400).json({
                msg: "User already exists with different credentials"
            });
        }
        else if (!existingUser) {
            const newUser = yield prisma.user.create({
                data: {
                    firstName: firstName,
                    lastName: lastName,
                    email: email,
                    password: password,
                    role: "EndUser",
                    points: 0
                }
            });
            if (!secret) {
                console.error("secret env variable not found");
                return res.status(500).json({
                    msg: "Internal server error"
                });
            }
            const token = jsonwebtoken_1.default.sign({
                email: email,
                id: newUser.id,
                role: newUser.role
            }, secret, { expiresIn: "30d" });
            return res.json({
                msg: "Account created successfully",
                token
            });
        }
    }
    catch (e) {
        console.error("error : " + e);
        return res.status(500).json({
            msg: "Internal server error"
        });
    }
}));
exports.authUserRouter.post("/signin", auth_middleware_1.signinMiddleware, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { email, password } = req.body;
        const existingUser = yield prisma.user.findUnique({
            where: {
                email: email
            }
        });
        if (!secret) {
            console.error("secret env variable not found");
            return res.status(500).json({
                msg: "Internal server error"
            });
        }
        if (!existingUser) {
            return res.status(404).json({
                msg: "User not found. Please sign up first."
            });
        }
        if (existingUser.password === password) {
            const token = jsonwebtoken_1.default.sign({
                email: email,
                id: existingUser.id,
                role: existingUser.role
            }, secret, { expiresIn: "30d" });
            return res.json({
                msg: "Logged in successfully",
                token
            });
        }
        else {
            return res.status(401).json({
                msg: "Incorrect password. Please try again."
            });
        }
    }
    catch (e) {
        console.error("error: " + e);
        return res.status(500).json({
            msg: "Internal server error"
        });
    }
}));
