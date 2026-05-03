import express from "express"
import http from "http"
import cors from "cors";
import { PrismaClient } from "@prisma/client"

import { WebSocketServer } from "ws"

import { authUserRouter } from "./auth/user.auth"
import { userRouter } from "./enduser/user.routes"

const app = express()
app.use(express.json())
const server = http.createServer(app)
const wss = new WebSocketServer({server})

// Initialize Prisma Client
const prisma = new PrismaClient()

// Connect to database
prisma.$connect()
  .then(() => {
    console.log("✅ Connected to database successfully")
  })
  .catch((err) => {
    console.error("❌ Failed to connect to database:", err)
    process.exit(1)
  })

app.use(cors({
  origin: "http://localhost:5173",  // your frontend URL
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  credentials: true                 // allow cookies/auth headers if needed
}));

app.get("/", (req, res)=>{
    res.json({
        msg:"hello server "
    })
})

app.use("/backend/v1/auth", authUserRouter)
app.use("/backend/v1", userRouter);

server.listen(5000, ()=>{console.log("🚀 Server running on http://localhost:5000")})

// Graceful shutdown
process.on("SIGINT", async () => {
  console.log("\n⚠️ Shutting down gracefully...")
  await prisma.$disconnect()
  server.close(() => {
    console.log("✅ Server closed")
    process.exit(0)
  })
})

//demo scan -> user will scan the QR code to connect with charging station