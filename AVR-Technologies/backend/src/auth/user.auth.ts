import e, { Router } from "express";
import { PrismaClient } from "@prisma/client";
export const authUserRouter = Router()

// import bodyParser from
import jwt from "jsonwebtoken"
import * as dotenv from "dotenv"

import { signinMiddleware, signupMiddleware } from "../middleware/auth.middleware";
dotenv.config()
const secret = process.env.SECRET
const prisma = new PrismaClient

//hidden apis for onboarding OEM, resellers
//operators onboarding apis might have to be public


authUserRouter.post("/signup", signupMiddleware, async (req, res) => {
    try {
        const { firstName, lastName, email, password } = req.body;
        const existingUser = await prisma.user.findUnique({
            where: {
                email: email
            }
        })

        if (!secret) {
            console.error("JWT_SECRET not found")
            return
        }

        if (existingUser && existingUser.lastName === lastName && existingUser.firstName === firstName && existingUser.password === password) {
            const token = jwt.sign({ 
                email: email, 
                id: existingUser.id,
                role: existingUser.role
            }, secret, { expiresIn: "30d" })
            res.json({
                msg: "logging you in",
                token
            })
            
        }

        else if(existingUser && (existingUser.lastName != lastName || existingUser.firstName != firstName || existingUser.password != password)){
            return res.status(400).json({
                msg:"User already exists with different credentials"
            })
        }

        else if(!existingUser){
            const newUser = await prisma.user.create({
                data:{
                    firstName:firstName,
                    lastName:lastName,
                    email:email,
                    password:password,
                    role:"EndUser",
                    points:0
                }
            })

            if(!secret){
                console.error("secret env variable not found")
                return res.status(500).json({
                    msg: "Internal server error"
                })
            }
            const token = jwt.sign({
                email: email, 
                id: newUser.id,
                role: newUser.role
            }, secret, {expiresIn:"30d"})
            return res.json({
                msg:"Account created successfully",
                token
            })
        }
    } catch (e) {
        console.error("error : " + e)
        return res.status(500).json({
            msg: "Internal server error"
        })
    }

})

authUserRouter.post("/signin", signinMiddleware, async(req, res)=>{
    try{
        const {email, password} = req.body;
        const existingUser = await prisma.user.findUnique({
            where:{
                email:email
            }
        })
    
        if(!secret){
            console.error("secret env variable not found")
            return res.status(500).json({
                msg: "Internal server error"
            })
        }
    
        if(!existingUser){
            return res.status(404).json({
                msg:"User not found. Please sign up first."
            })
        }
    
        if(existingUser.password === password){
            const token = jwt.sign({
                email: email, 
                id: existingUser.id,
                role: existingUser.role
            }, secret, {expiresIn:"30d"})
            return res.json({
                msg:"Logged in successfully",
                token
            })
        } else {
            return res.status(401).json({
                msg:"Incorrect password. Please try again."
            })
        }
    
    }
    catch(e){
        console.error("error: " + e )
        return res.status(500).json({
            msg: "Internal server error"
        })
    }
    
})