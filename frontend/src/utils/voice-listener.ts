export type VoiceListenerState = {
  isEnabled: boolean;
};

type VoiceListenerStateListener = (state: VoiceListenerState) => void;

let voiceListenerState: VoiceListenerState = {
  isEnabled: false
};

const voiceListenerStateListeners = new Set<VoiceListenerStateListener>();

export const setVoiceListenerState = (nextState: Partial<VoiceListenerState>) => {
  const previousState = voiceListenerState;
  voiceListenerState = {
    ...voiceListenerState,
    ...nextState
  };

  if (previousState.isEnabled !== voiceListenerState.isEnabled) {
    console.info(
      `[Mirror voice] command listener ${voiceListenerState.isEnabled ? "enabled" : "disabled"}`
    );
  }

  voiceListenerStateListeners.forEach((listener) => listener(voiceListenerState));
};

export const subscribeToVoiceListenerState = (listener: VoiceListenerStateListener) => {
  voiceListenerStateListeners.add(listener);
  listener(voiceListenerState);

  return () => {
    voiceListenerStateListeners.delete(listener);
  };
};
