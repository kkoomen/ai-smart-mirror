import { useCallback } from "react";
import type { Dispatch, MutableRefObject } from "react";
import i18n from "../../../i18n";
import type { AppLanguage } from "../../../i18n/languages";
import { updateUserLanguage } from "../../../api/users";
import { buildKnownUsersWithUpdatedUser, type MirrorAction } from "../mirror-reducer";
import type { User } from "../../../types/user";

type LanguageFlowOptions = {
  dispatch: Dispatch<MirrorAction>;
  knownUsers: User[];
  loadDashboardData: (userId: number, location: string) => Promise<void>;
  navigate: (path: string) => void;
  pendingLanguageChangeRef: MutableRefObject<AppLanguage | null>;
  registeredUser: User | null;
};

export const useLanguageFlow = ({
  dispatch,
  knownUsers,
  loadDashboardData,
  navigate,
  pendingLanguageChangeRef,
  registeredUser
}: LanguageFlowOptions) => {
  const persistUserLanguage = useCallback(
    async (language: AppLanguage) => {
      if (!registeredUser) {
        return;
      }

      const response = await updateUserLanguage(registeredUser.id, {
        preferredLanguage: language
      });

      dispatch({ type: "REGISTERED_USER_CHANGED", user: response.user });
      dispatch({
        type: "KNOWN_USERS_CHANGED",
        users: buildKnownUsersWithUpdatedUser(knownUsers, response.user)
      });
      await loadDashboardData(response.user.id, response.user.location);
    },
    [dispatch, knownUsers, loadDashboardData, registeredUser]
  );

  const beginLanguageChange = useCallback(
    (language: AppLanguage) => {
      pendingLanguageChangeRef.current = language;
      dispatch({ type: "LANGUAGE_CHANGE_STARTED" });
    },
    [dispatch, pendingLanguageChangeRef]
  );

  const finishLanguageChange = useCallback(async () => {
    const targetLanguage = pendingLanguageChangeRef.current;
    pendingLanguageChangeRef.current = null;

    if (!targetLanguage || !registeredUser) {
      dispatch({ type: "MIRROR_FADING_CHANGED", isFadingOut: false });
      return;
    }

    await i18n.changeLanguage(targetLanguage);
    await persistUserLanguage(targetLanguage);
    dispatch({ type: "LANGUAGE_CHANGE_COMPLETED" });
    navigate("/");
  }, [dispatch, navigate, pendingLanguageChangeRef, persistUserLanguage, registeredUser]);

  return {
    beginLanguageChange,
    finishLanguageChange,
    persistUserLanguage
  };
};
