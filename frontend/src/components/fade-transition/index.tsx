import { type ReactNode, useRef } from "react";
import { CSSTransition, SwitchTransition } from "react-transition-group";
import styles from "./styles.module.css";

const duration = 450;

type FadeTransitionProps = {
  children: ReactNode;
  transitionKey?: string;
  show?: boolean;
  mode?: "out-in" | "in-out";
  className?: string;
  onExited?: () => void;
};

export default function FadeTransition({
  children,
  transitionKey,
  show = true,
  mode = "out-in",
  className = "",
  onExited
}: FadeTransitionProps) {
  const nodeRef = useRef<HTMLDivElement | null>(null);

  if (transitionKey) {
    return (
      <SwitchTransition mode={mode}>
        <CSSTransition
          key={transitionKey}
          nodeRef={nodeRef}
          timeout={duration}
          classNames={{
            enter: styles.fadeEnter,
            enterActive: styles.fadeEnterActive,
            exit: styles.fadeExit,
            exitActive: styles.fadeExitActive
          }}
          unmountOnExit
        >
          <div ref={nodeRef} className={className}>
            {children}
          </div>
        </CSSTransition>
      </SwitchTransition>
    );
  }

  return (
    <CSSTransition
      in={show}
      nodeRef={nodeRef}
      timeout={duration}
      classNames={{
        enter: styles.fadeEnter,
        enterActive: styles.fadeEnterActive,
        exit: styles.fadeExit,
        exitActive: styles.fadeExitActive
      }}
      mountOnEnter
      unmountOnExit
      onExited={onExited}
    >
      <div ref={nodeRef} className={className}>
        {children}
      </div>
    </CSSTransition>
  );
}
