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
            enter: styles["fade-enter"],
            enterActive: styles["fade-enter-active"],
            exit: styles["fade-exit"],
            exitActive: styles["fade-exit-active"]
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
        enter: styles["fade-enter"],
        enterActive: styles["fade-enter-active"],
        exit: styles["fade-exit"],
        exitActive: styles["fade-exit-active"]
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
