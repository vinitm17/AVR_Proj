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
const express_1 = __importDefault(require("express"));
const http_1 = __importDefault(require("http"));
const cors_1 = __importDefault(require("cors"));
const client_1 = require("@prisma/client");
const ws_1 = require("ws");
const user_auth_1 = require("./auth/user.auth");
const user_routes_1 = require("./enduser/user.routes");
const hw_routes_1 = require("./hardware/hw.routes");
const operator_routes_1 = require("./operator/operator.routes");
const app = (0, express_1.default)();
app.use(express_1.default.json());
const server = http_1.default.createServer(app);
const wss = new ws_1.WebSocketServer({ server });
// Initialize Prisma Client
const prisma = new client_1.PrismaClient();
// Connect to database
prisma.$connect()
    .then(() => {
    console.log("✅ Connected to database successfully");
})
    .catch((err) => {
    console.error("❌ Failed to connect to database:", err);
    process.exit(1);
});
app.use((0, cors_1.default)({
    origin: "http://localhost:5173", // your frontend URL
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    credentials: true // allow cookies/auth headers if needed
}));
app.get("/", (req, res) => {
    res.json({
        msg: "hello server "
    });
});
app.use("/backend/v1/auth", user_auth_1.authUserRouter);
app.use("/backend/v1", user_routes_1.userRouter);
app.use("/backend/v1/hw", hw_routes_1.hwRouter);
app.use("/backend/v1/operator", operator_routes_1.operatorRouter);
server.listen(5000, "0.0.0.0", () => { console.log("🚀 Server running on http://localhost:5000"); });
// Graceful shutdown
process.on("SIGINT", () => __awaiter(void 0, void 0, void 0, function* () {
    console.log("\n⚠️ Shutting down gracefully...");
    yield prisma.$disconnect();
    server.close(() => {
        console.log("✅ Server closed");
        process.exit(0);
    });
}));
//demo scan -> user will scan the QR code to connect with charging station
