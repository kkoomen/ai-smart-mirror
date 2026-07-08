import FadeTransition from "../fade-transition";
import MirrorLayout from "../mirror-layout";

export default function RegisterScreen({
  visible = true,
  onExited,
  center
}) {
  return (
    <FadeTransition show={visible} className="min-h-screen" onExited={onExited}>
      <FadeTransition transitionKey="register" className="min-h-screen">
        <MirrorLayout showPanels={false} center={center} />
      </FadeTransition>
    </FadeTransition>
  );
}
