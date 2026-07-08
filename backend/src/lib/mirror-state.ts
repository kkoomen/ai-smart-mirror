import { prisma } from "./prisma.js";

export const ensureMirrorState = async () => {
  const state = await prisma.mirrorState.findFirst();

  if (state) {
    return state;
  }

  return prisma.mirrorState.create({
    data: {
      registrationComplete: false
    }
  });
};

export const getMirrorState = async () => {
  return ensureMirrorState();
};

export const deriveMirrorMode = (params: {
  userCount: number;
  state: {
    activeUserId: number | null;
    registrationComplete: boolean;
  };
}) => {
  const { userCount, state } = params;

  if (userCount === 0) {
    return "no_user" as const;
  }

  if (state.activeUserId && !state.registrationComplete) {
    return "registering" as const;
  }

  if (state.activeUserId && state.registrationComplete) {
    return "recognized" as const;
  }

  if (userCount > 0) {
    return "unknown" as const;
  }

  return "no_user" as const;
};
