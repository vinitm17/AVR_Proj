import Jwt from "jsonwebtoken";
import * as dotenv from "dotenv"
import { z } from "zod"
import { Request, Response, NextFunction } from "express";

dotenv.config()
const SECRET = process.env.SECRET

const signupSchema = z.object({
    email: z.string().email("Invalid email format"),
    password: z.string().min(6).max(16),
    firstName: z.string(),
    lastName: z.string()
})

const signinSchema = z.object({
    email: z.string().email("Invalid email format"),
    password: z.string().min(6).max(50)
})

export const signupMiddleware = (req: Request, res: Response, next: NextFunction) => {
    const parse = signupSchema.safeParse(req.body)
    if (!parse.success) {
        res.json({
            msg: "credentials do not match criteria",
            error: parse.error.issues
        })
        return
    }
    next();
}

export const signinMiddleware = (req: Request, res: Response, next: NextFunction) => {
    const parse = signinSchema.safeParse(req.body)
    if (!parse.success) {
        res.json({
            msg: "credentials do not match criteria"
        })
        return
    }
    next();
}

export interface userReq extends Request {
    email?: string,
    id?: number,
    role?: string
}

export const verifyJWT = (req: userReq, res: Response, next: NextFunction) => {
    const auth = req.headers.authorization || req.headers.Authorization
    if (!auth || typeof auth !== "string" || !auth.startsWith("Bearer ")) {
        res.json({ msg: "token not found" })
        return
    }

    if (!SECRET) {
        console.error("env variable SECRET not found")
        return
    }

    const token = auth.split(" ")[1]
    if (!token) {
        console.error("token not found after Bearer")
        return
    }

    try {
        const decoded = Jwt.verify(token, SECRET) as { email: string, id: number, role: string, iat: number }
        req.email = decoded.email
        req.id = decoded.id
        req.role = decoded.role
        next()
    } catch (err) {
        res.status(401).json({ msg: "Invalid or expired token" })
    }
}
