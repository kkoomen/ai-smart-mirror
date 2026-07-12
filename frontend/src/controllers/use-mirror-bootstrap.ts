import { useEffect } from "react";
import { getUsers } from "../api/users";
import type { MirrorBootstrapOptions } from "../types/mirror-controller";

export const useMirrorBootstrap = ({
  browserFaceService,
  bootstrapActions
}: MirrorBootstrapOptions) => {
  useEffect(() => {
    const bootstrap = async () => {
      try {
        try {
          await browserFaceService.load();
        } catch {
          // Bootstrap can continue; UI will show backend/camera status later if detection fails.
        }

        const usersResponse = await getUsers();

        bootstrapActions.loadKnownUsers(usersResponse.users);
        bootstrapActions.enterIdle();
      } catch {
        bootstrapActions.failBootstrap();
      }
    };

    void bootstrap();
  }, [bootstrapActions, browserFaceService]);
};
