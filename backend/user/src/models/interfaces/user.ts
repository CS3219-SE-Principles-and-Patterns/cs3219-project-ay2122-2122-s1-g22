export default interface IUser {
  _id: string;
  display_name: string;
  email: string;
  password: string;
  deleted_at?: Date;
  created_at: Date;
  updated_at: Date;
}