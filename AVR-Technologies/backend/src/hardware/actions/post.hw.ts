import { Router } from "express";
import { Response } from "express";
import { PrismaClient } from "@prisma/client";
import { userReq, verifyJWT } from "../../middleware/auth.middleware";

export const postHwRouter = Router()
const prisma = new PrismaClient()

postHwRouter.post("/register", verifyJWT, async(req:userReq, res:Response)=>{
    try{
        const userId = req.id
        if(!userId){
            return res.json(401).json({
                msg:"user not authenticated"
            })
        }

        const user = await prisma.user.findUnique({
            where:{
                id:userId
            }
        })

        if(!user){
            return res.json(401).json({
                msg:"user not authenticated"
            })
        }

        if(user.role=="Operator" || user.role=="EndUser"){
            return res.json(401).json({
                msg:"you are not allowed"
            })
        }

        //assuming they have hardware IDs for every hardware
        const {hwId} = req.body 
        
    }catch(e){
        console.error("error found - "  + e)
    }
})
