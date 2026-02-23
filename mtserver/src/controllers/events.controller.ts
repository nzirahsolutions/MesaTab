import type { Request, Response } from "express";
import { eq } from "drizzle-orm";
import { db } from "../db/db";
import { event } from "../db/schema";

export async function createEvent(req: Request, res: Response){
    console.log('Create Event Called');
    try{
      const { title, slug, organizer } = req.body as {
        title?: string;
        slug?: string;
        organizer?: string;
        };
    }
    catch(error){
        
    }
}