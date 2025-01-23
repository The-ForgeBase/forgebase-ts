import { UserContext } from "database";
import { Session, User } from "better-auth/types";

export const elysiaUserMiddleware = async (session: any) => {
  if (!session) {
    return {
      user: null,
      session: null,
      userContext: {
        userId: "",
        labels: [],
        teams: [],
        permissions: [],
        role: "",
      },
    };
  }
  let labels: string[] = [];
  if (session.user.labels) {
    labels = session.user.labels.split(",");
  }
  let teams: string[] = [];
  if (session.user.teams) {
    teams = session.user.teams.split(",");
  }
  let permissions: string[] = [];
  if (session.user.permissions) {
    permissions = session.user.permissions.split(",");
  }
  const userContext: UserContext = {
    userId: session.user.id,
    labels,
    teams,
    permissions,
    role: session.user.role || "",
  };

  return {
    user: session.user,
    session: session.session,
    userContext: userContext,
  };
};

export const userInfo = (
  user: User | null,
  session: Session | null,
  userContext: UserContext
) => {
  return {
    user: user,
    session: session,
    userContext: userContext,
  };
};
