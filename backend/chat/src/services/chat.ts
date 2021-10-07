import mongoose from "mongoose";

import IChat from "../models/interfaces/chat";

export default function makeChatService({ chatDbModel }: { chatDbModel: mongoose.Model<IChat & mongoose.Document> }) {
  return new (class MongooseChatDb {
    async insert(insertPayload: Partial<IChat>): Promise<IChat | null> {
      const result = await chatDbModel.create([insertPayload]);
      const updated = await chatDbModel.findOne({ _id: result[0]?._id });
      if (updated) {
        return updated;
      }
      return null;
    }

    async findById({ id }: { id: string }): Promise<IChat | null> {
      const existing = await chatDbModel.findById(id);
      if (existing) {
        return existing;
      }
      return null;
    }

    async findAll(): Promise<IChat[]> {
      const query_conditions = { deleted_at: undefined };
      const existing = await chatDbModel.find(query_conditions).sort({ updated_at: "desc" });
      if (existing) {
        return existing;
      }
      return [];
    }

    async update(payload: Partial<IChat>): Promise<IChat | null> {
      await chatDbModel.findOneAndUpdate({ _id: payload._id }, payload);
      const updated = await chatDbModel.findById({ _id: payload._id });
      if (updated) {
        return updated;
      }
      return null;
    }

    async hardDelete({ id }: { id: string }): Promise<boolean> {
      const result = await chatDbModel.deleteOne({ _id: id });
      return result.deletedCount > 0;
    }

    async delete({ id }: { id: string }): Promise<IChat | null> {
      const existing = await chatDbModel.findOneAndUpdate({ _id: id }, { deleted_at: new Date() });
      if (existing) {
        return existing;
      }
      return null;
    }
  })();
}