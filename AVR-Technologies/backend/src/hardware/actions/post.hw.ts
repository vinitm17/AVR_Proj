import { Router } from "express";
import { Response } from "express";
import { PrismaClient } from "@prisma/client";
import { userReq, verifyJWT } from "../../middleware/auth.middleware";
import * as dotenv from "dotenv";
dotenv.config();

// Called from startCharging / stopCharging — fire and forget, never blocks the main flow
export async function notifyHardware(action: 'start' | 'stop', stationId: number): Promise<void> {
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
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
            signal: AbortSignal.timeout(5000),
        });
        const data = await res.json() as Record<string, unknown>;
        console.log(`[HW] station ${stationId} ${action}:`, data);
    } catch (e) {
        console.error(`[HW] station ${stationId} ${action} failed:`, e);
    }
}

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

//write here the post api of 12 points p1, p2, etc