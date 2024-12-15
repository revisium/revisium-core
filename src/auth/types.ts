export type IAuthUser = {
  userId: string;
  email: string;
};

export type IOptionalAuthUser =
  | {
      userId: string;
      email: string;
    }
  | undefined;
