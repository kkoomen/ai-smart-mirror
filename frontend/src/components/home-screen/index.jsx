import FadeTransition from "../fade-transition";
import MirrorLayout from "../mirror-layout";

export default function HomeScreen({
  showPanels,
  showGradient,
  blank = false,
  visible = true,
  onExited,
  weather,
  time,
  agenda,
  deviceStatus,
  center
}) {
  return (
    <FadeTransition show={visible} className="min-h-screen" onExited={onExited}>
      <FadeTransition transitionKey={showPanels ? "home-panels" : "home-blank"} className="min-h-screen">
        <MirrorLayout
          blank={blank}
          showPanels={showPanels}
          showGradient={showGradient}
          weather={weather}
          time={time}
          agenda={agenda}
          deviceStatus={deviceStatus}
          center={center}
        />
      </FadeTransition>
    </FadeTransition>
  );
}
