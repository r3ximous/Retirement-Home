import GachaPanel from "./gacha-panel";

export default function RewardsPage() {
  return (
    <main className="min-h-screen bg-white px-5 py-8 text-slate-950 mobile:px-8 tablet:px-12">
      <div className="mx-auto max-w-5xl">
        <h1 className="text-3xl font-semibold tracking-wide mobile:text-4xl">
          Your rewards
        </h1>
        <div className="mt-5">
          <GachaPanel />
        </div>
      </div>
    </main>
  );
}
