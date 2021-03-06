import mongoose from "mongoose";
import IUser, { UserRole } from "../models/interfaces/user";

export default function makeUserService({ userDbModel }: { userDbModel: mongoose.Model<IUser & mongoose.Document> }) {
  return new (class MongooseUserDb {
    async insertUser(insertPayload: Partial<IUser>): Promise<IUser | null> {
      const result = await userDbModel.create([insertPayload]);
      const updated = await userDbModel.findOne({ _id: result[0]?._id });
      if (updated) {
        return updated;
      }
      return null;
    }

    async findById({ id }: { id: string }): Promise<IUser | null> {
      const query_conditions = { _id: id, deleted_at: undefined };
      const existing = await userDbModel.findOne(query_conditions).lean();
      if (existing) {
        return existing;
      }
      return null;
    }

    async findByEmail({ email, role = UserRole.USER }: { email: string; role?: UserRole }): Promise<IUser | null> {
      const query_conditions = { email, role, deleted_at: undefined };
      const existing = await userDbModel.findOne(query_conditions).lean();
      if (existing) {
        return existing;
      }
      return null;
    }

    async findByEmailExists({ email }: { email: string }): Promise<IUser | null> {
      const query_conditions = { email };
      const existing = await userDbModel.findOne(query_conditions).lean();
      if (existing) {
        return existing;
      }
      return null;
    }

    async findAll(): Promise<IUser[]> {
      const query_conditions = { deleted_at: undefined };
      const existing = await userDbModel.find(query_conditions).sort({ updated_at: "desc" }).lean();
      if (existing) {
        return existing;
      }
      return [];
    }

    async findAllByUserIds({ user_ids }: { user_ids: string[] }): Promise<IUser[]> {
      const query_conditions = { deleted_at: undefined, _id: { $in: user_ids } };
      const existing = await userDbModel.find(query_conditions).sort({ updated_at: "desc" }).lean();
      if (existing) {
        return existing;
      }
      return [];
    }

    async update(payload: Partial<IUser>): Promise<IUser | null> {
      await userDbModel.findOneAndUpdate({ _id: payload._id }, payload);
      const updated = await userDbModel.findById({ _id: payload._id }).lean();
      if (updated) {
        return updated;
      }
      return null;
    }

    async hardDelete({ id }: { id: string }): Promise<boolean> {
      const result = await userDbModel.deleteOne({ _id: id });
      return result.deletedCount > 0;
    }

    async delete({ id }: { id: string }): Promise<IUser | null> {
      const existing = await userDbModel.findOneAndUpdate({ _id: id }, { deleted_at: new Date() }).lean();
      if (existing) {
        return existing;
      }
      return null;
    }

    async reset(): Promise<boolean> {
      const result = await userDbModel.deleteMany({});
      return result.deletedCount > 0;
    }
  })();
}
