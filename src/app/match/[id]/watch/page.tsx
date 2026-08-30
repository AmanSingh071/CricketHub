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
        Player area for an official or otherwise authorized embed source.
      </p>
      <div className="card mt-8 overflow-hidden rounded-3xl bg-black">
        <iframe
          src="https://playcrichd.st/update/fetch.php?hd=11&embed=1"
          width="100%"
          height="500"
          scrolling="no"
          frameBorder="0"
          allowFullScreen
          allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
          title="Cricket Stream Player"
        />
      </div>
    </main>
  );
}
