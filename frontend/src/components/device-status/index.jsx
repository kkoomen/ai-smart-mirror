export default function DeviceStatus({ camera, microphone, network, battery }) {
  return (
    <section className="space-y-4">
      <p className="text-xs uppercase tracking-[0.5em] text-white/45">device</p>
      <div className="space-y-2 text-sm uppercase tracking-[0.3em] text-white/75 lg:text-right">
        <div>camera: {camera}</div>
        <div>microphone: {microphone}</div>
        <div>network: {network}</div>
        <div>battery: {battery}</div>
      </div>
    </section>
  );
}
