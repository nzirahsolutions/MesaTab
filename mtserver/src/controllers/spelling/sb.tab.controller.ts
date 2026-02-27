import { Request, Response } from "express";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "../../db/db";
import { tabsSB, institutionsSB, spellers,tabMastersSB, roomsSB, roundsSB, judgesSB} from "../../db/schema";

//tab
export async function getFullTab(req: Request, res: Response) {
  try {
    const { tabId } = req.params as { tabId?: string };

    if (!tabId) {
      return res.status(400).json({ message: "tabId is required" });
    }

    const tabRow = await db
      .select({
        tabId: tabsSB.tabId,
        eventId: tabsSB.eventId,
        title: tabsSB.title,
        slug: tabsSB.slug,
        track: tabsSB.track,
      })
      .from(tabsSB)
      .where(eq(tabsSB.tabId, tabId))
      .limit(1);

    if (!tabRow.length) {
      return res.status(404).json({ message: "Tab not found" });
    }

    const tab = tabRow[0];

    const [institutionsRow, spellingBees, judges,tabMasters, rooms, rounds] =
      await Promise.all([
        db
          .select({
            id: institutionsSB.institutionId,
            name: institutionsSB.name,
            code: institutionsSB.code,
          })
          .from(institutionsSB)
          .where(eq(institutionsSB.tabId, tab.tabId)),

        db
          .select({
            id: spellers.spellerId,
            name: spellers.name,
            email: spellers.email,
            institutionId: spellers.institutionId,
          })
          .from(spellers)
          .where(eq(spellers.tabId, tab.tabId)),

        db
          .select({
            id: judgesSB.judgeId,
            name: judgesSB.name,
            email: judgesSB.email,
            institutionId: judgesSB.institutionId,
          })
          .from(judgesSB)
          .where(eq(judgesSB.tabId, tab.tabId)),
        db
          .select({
            id: tabMastersSB.tabMasterId,
            name: tabMastersSB.name,
            email: tabMastersSB.email,
            institutionId: tabMastersSB.institutionId,
          })
          .from(tabMastersSB)
          .where(eq(tabMastersSB.tabId, tab.tabId)),

        db
          .select({
            id: roomsSB.roomId,
            name: roomsSB.name,
          })
          .from(roomsSB)
          .where(eq(roomsSB.tabId, tab.tabId)),

        db
          .select({
            roundId: roundsSB.roundId,
            name: roundsSB.name,
            breaks: roundsSB.breaks,
            completed: roundsSB.completed,
            type: roundsSB.type,
            timeLimit: roundsSB.timeLimit,
            wordLimit: roundsSB.wordLimit,
          })
          .from(roundsSB)
          .where(eq(roundsSB.tabId, tab.tabId)),

      ]);
      const institutions= institutionsRow.map((i)=>({
        id: i.id,
        name: i.name,
        code: i.code,
        spellers: spellingBees.filter((s)=>s.institutionId===i.id).length,
      }))


    return res.status(200).json({
      message: "Tab fetched successfully",
      data: {
        tabID: tab.tabId,
        eventID: tab.eventId,
        track: tab.track,
        title: tab.title,
        slug: tab.slug,
        institutions,
        spellingBees,
        judges,
        tabMasters,
        rooms,
        rounds,
        words: [],
      },
    });
  } catch (error) {
    console.error("getFullTab error:", error);
    return res.status(500).json({ message: "failed to fetch tab" });
  }
}

//institution
export async function addInstitution(req: Request, res: Response) {
    // console.log('Add institution');
    try {
        const {name, code, tabId}=req.body as {
            name: string;
            code: string;
            tabId: string;
        }
        const normalizedCode=code.trim().toUpperCase();
        
        if (!name || !normalizedCode || !tabId) {
            return res
            .status(400)
            .json({ message: "School name and code are required" });
        }
        const existing = await db
                    .select({ code: institutionsSB.code })
                    .from(institutionsSB)
                    .where(and(eq(institutionsSB.code, normalizedCode),eq(institutionsSB.tabId, tabId)))
                    .limit(1);
      
        if (existing.length > 0) {
            return res.status(409).json({ message: "Institute code is already in tab" });
        }
        const added = await db
            .insert(institutionsSB)
            .values({
            name: name,
            code: normalizedCode,
            tabId: tabId,
            })
            .returning({
            name: institutionsSB.name,
            code: institutionsSB.code,
            tabId: institutionsSB.tabId,
            });

        const addedInstitution = added[0];

        return res.status(201).json({
            message: "Institution Added Successfully",
            data: addedInstitution,
        });
        
    } 
    catch(error){
        console.error("addInstitution error:", error);
        return res.status(500).json({ message: "failed to add Instituition" });
    }
}
export async function updateInstitution(req: Request, res: Response) {
    // console.log('Update Institution');
    try {
        const {name, code, tabId, id}=req.body as {
            name: string;
            code: string;
            tabId: string;
            id: number;
        }

        if((!name && !code) || !tabId || !id)
            return res.status(400).json({message:'Provide at least code  or name'});
        const updates:{name?: string; code?: string}={};
        if(name) updates.name=name;
        if(code) updates.code=code.trim().toUpperCase();

        //ensure code is unique in the ssame tab
        if(updates.code){
          const existing=await db
            .select({id: institutionsSB.institutionId})
            .from(institutionsSB)
            .where(and(eq(institutionsSB.tabId, tabId),eq(institutionsSB.code,updates.code )))
            .limit(1);
            if(existing.length && existing[0].id !==id){
              return res.status(409).json({message:'Instituion code is already in tab'});
            }
        }
        const updated= await db
        .update(institutionsSB)
        .set(updates)
        .where(and(eq(institutionsSB.tabId, tabId),eq(institutionsSB.institutionId, id)))
        .returning({
          institutionId: institutionsSB.institutionId,
          name: institutionsSB.name,
          code: institutionsSB.code,
          tabId: institutionsSB.tabId,
        });
        if(!updated.length) return res.status(404).json({message:'Institution not found'});

        return res.status(200).json({message:'Institution updated successfully',
          data: updated[0],
        })

    } 
    catch(error){
    console.error("updateInstitution error:", error);
    return res.status(500).json({ message: "failed to update Instituition" });
    }
}
export async function deleteInstitution(req: Request, res: Response) {
    try {
      console.log(req.body);
      const {id, tabId}=req.body as{
        id?: number;
        tabId?: string;
      }
      if(!id || !tabId) res.status(400).json({message:'id and tabId required'});
    
    // // Optional: prevent delete if spellers/judges still reference this institution
    // const spellerCount = await db
    //   .select({ id: spellers.spellerId })
    //   .from(spellers)
    //   .where(eq(spellers.institutionId, id))
    //   .limit(1);

    // const judgeCount = await db
    //   .select({ id: judgesSB.judgeId })
    //   .from(judgesSB)
    //   .where(eq(judgesSB.institutionId, id))
    //   .limit(1);

    // if (spellerCount.length || judgeCount.length) {
    //   return res.status(409).json({
    //     message: "Cannot delete institution with linked spellers or judges",
    //   });
    // }

    const deleted = await db
      .delete(institutionsSB)
      .where(and(
        eq(institutionsSB.institutionId, id),
        eq(institutionsSB.tabId, tabId)
      ))
      .returning({
        institutionId: institutionsSB.institutionId,
        name: institutionsSB.name,
        code: institutionsSB.code,
        tabId: institutionsSB.tabId,
      });

    if (!deleted.length) {
      return res.status(404).json({ message: "Institution not found" });
    }

    return res.status(200).json({
      message: "Institution deleted successfully",
      data: deleted[0],
    });
    } 
    catch(error){
    console.error("deleteInstitution error:", error);
    return res.status(500).json({ message: "failed to delete Instituition" });
    }
}
//speller
export async function addSpeller(req: Request, res: Response) {
    try {
        
    } 
    catch(error){
    console.error("addSpeller error:", error);
    return res.status(500).json({ message: "failed to add speller" });
    }
}
export async function updateSpeller(req: Request, res: Response) {
    try {
        
    } 
    catch(error){
    console.error("updateSpeller error:", error);
    return res.status(500).json({ message: "failed to update speller" });
    }
}
export async function deleteSpeller(req: Request, res: Response) {
    try {
        
    } 
    catch(error){
    console.error("deleteSpeller error:", error);
    return res.status(500).json({ message: "failed to delete speller" });
    }
}
//judge
export async function addJudge(req: Request, res: Response) {
    try {
        
    } 
    catch(error){
    console.error("addJudge error:", error);
    return res.status(500).json({ message: "failed to add judge" });
    }
}
export async function updateJudge(req: Request, res: Response) {
    try {
        
    } 
    catch(error){
    console.error("updateJudge error:", error);
    return res.status(500).json({ message: "failed to update judge" });
    }
}
export async function deleteJudge(req: Request, res: Response) {
    try {
        
    } 
    catch(error){
    console.error("deleteJudge error:", error);
    return res.status(500).json({ message: "failed to delete judge" });
    }
}
//room
export async function addRoom(req: Request, res: Response) {
    try {
        
    } 
    catch(error){
    console.error("addRoom error:", error);
    return res.status(500).json({ message: "failed to add room" });
    }
}
export async function updateRoom(req: Request, res: Response) {
    try {
        
    } 
    catch(error){
    console.error("updateRoom error:", error);
    return res.status(500).json({ message: "failed to update room" });
    }
}
export async function deleteRoom(req: Request, res: Response) {
    try {
        
    } 
    catch(error){
    console.error("deleteRoom error:", error);
    return res.status(500).json({ message: "failed to delete room" });
    }
}
//round
export async function addRound(req: Request, res: Response) {
    try {
        
    } 
    catch(error){
    console.error("addRound error:", error);
    return res.status(500).json({ message: "failed to add round" });
    }
}
export async function updateRound(req: Request, res: Response) {
    try {
        
    } 
    catch(error){
    console.error("updateRound error:", error);
    return res.status(500).json({ message: "failed to update round" });
    }
}
export async function deleteRound(req: Request, res: Response) {
    try {
        
    } 
    catch(error){
    console.error("deleteRound error:", error);
    return res.status(500).json({ message: "failed to delete round" });
    }
}
//word
export async function addWord(req: Request, res: Response) {
    try {
        
    } 
    catch(error){
    console.error("addWord error:", error);
    return res.status(500).json({ message: "failed to add word" });
    }
}
export async function deleteWord(req: Request, res: Response) {
    try {
        
    } 
    catch(error){
    console.error("deletWord error:", error);
    return res.status(500).json({ message: "failed to delete word" });
    }
}
//Draw
export async function generateDraw(req: Request, res: Response) {
    try {
        
    } 
    catch(error){
    console.error("generateDraw error:", error);
    return res.status(500).json({ message: "failed to generate draw" });
    }
}
export async function updateDraw(req: Request, res: Response) {
    try {
        
    } 
    catch(error){
    console.error("updateDraw error:", error);
    return res.status(500).json({ message: "failed to update draw" });
    }
}
export async function deleteDraw(req: Request, res: Response) {
    try {
        
    } 
    catch(error){
    console.error("deleteDraw error:", error);
    return res.status(500).json({ message: "failed to delete draw" });
    }
}