"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const http_1 = __importDefault(require("http"));
const ws_1 = require("ws");
const user_auth_1 = require("./auth/user.auth");
const user_routes_1 = require("./enduser/user.routes");
const app = (0, express_1.default)();
app.use(express_1.default.json());
const server = http_1.default.createServer(app);
const wss = new ws_1.WebSocketServer({ server });
app.get("/", (req, res) => {
    res.json({
        msg: "hello server "
    });
});
app.use("/backend/v1/auth", user_auth_1.authUserRouter);
app.use("/backend/v1", user_routes_1.userRouter);
server.listen(5000, () => { console.log("server running on 5000"); });
//demo scan -> user will scan the QR code to connect with charging station
