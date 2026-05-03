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
exports.verifyJWT = exports.signinMiddleware = exports.signupMiddleware = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const dotenv = __importStar(require("dotenv"));
const zod_1 = require("zod");
dotenv.config();
const SECRET = process.env.SECRET;
const signupSchema = zod_1.z.object({
    email: zod_1.z.string().email("Invalid email format"),
    password: zod_1.z.string().min(6).max(16),
    firstName: zod_1.z.string(),
    lastName: zod_1.z.string()
});
const signinSchema = zod_1.z.object({
    email: zod_1.z.string().email("Invalid email format"),
    password: zod_1.z.string().min(6).max(50)
});
const signupMiddleware = (req, res, next) => {
    const parse = signupSchema.safeParse(req.body);
    if (!parse.success) {
        res.json({
            msg: "credentials do not match criteria",
            error: parse.error.issues
        });
        return;
    }
    next();
};
exports.signupMiddleware = signupMiddleware;
const signinMiddleware = (req, res, next) => {
    const parse = signinSchema.safeParse(req.body);
    if (!parse.success) {
        res.json({
            msg: "credentials do not match criteria"
        });
        return;
    }
    next();
};
exports.signinMiddleware = signinMiddleware;
const verifyJWT = (req, res, next) => {
    const auth = req.headers.authorization || req.headers.Authorization;
    if (!auth || typeof auth !== "string" || !auth.startsWith("Bearer ")) {
        res.json({ msg: "token not found" });
        return;
    }
    if (!SECRET) {
        console.error("env variable SECRET not found");
        return;
    }
    const token = auth.split(" ")[1];
    if (!token) {
        console.error("token not found after Bearer");
        return;
    }
    try {
        const decoded = jsonwebtoken_1.default.verify(token, SECRET);
        req.email = decoded.email;
        req.id = decoded.id;
        req.role = decoded.role;
        next();
    }
    catch (err) {
        res.status(401).json({ msg: "Invalid or expired token" });
    }
};
exports.verifyJWT = verifyJWT;
