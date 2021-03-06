import mongoose from "mongoose";
import chatSchema from "../data-access/schemas/chat";
import IChat from "./interfaces/chat";

const chatDbModel = mongoose.model<IChat & mongoose.Document>("Chat", chatSchema);

export default Object.freeze({ chatDbModel });
export { chatDbModel };
