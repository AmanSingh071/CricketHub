export default async function WatchPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-4 py-8">
      <a href={"/match/" + id} className="text-green-400">
        ← Match Center
      </a>

      <h1 className="mt-8 text-4xl font-black">Watch Center</h1>

      <p className="mt-2 text-sm text-slate-400">
        Video player source is not currently configured.
      </p>

      <div className="card mt-8 flex aspect-video items-center justify-center rounded-3xl bg-black p-8 text-center">
        <div>
          <div className="text-5xl">📺</div>
          <h2 className="mt-5 text-xl font-bold">No video source configured</h2>
          <p className="mt-2 max-w-xl text-sm text-slate-400">
            Configure an authorized embed source to enable live video playback.
          </p>
        </div>
      </div>
    </main>
  );
}
