import { useEffect, useState } from "react";
import { ready as storageReady } from "../lib/secureStorage";
import { isOnboarded } from "../lib/onboarding";
import Welcome from "../pages/Welcome";

export default function OnboardingGate({ children }: { children: JSX.Element }) {
  const [ready, setReady] = useState(storageReady());
  const [done, setDone] = useState<boolean | null>(null);

  // wait until secure storage key is available (unlock / passphrase)
  useEffect(() => {
    if (ready) return;

    const id = window.setInterval(() => {
      if (storageReady()) {
        setReady(true);
        window.clearInterval(id);
      }
    }, 200);

    return () => window.clearInterval(id);
  }, [ready]);

  // read onboarded flag only after key is ready
  useEffect(() => {
    if (!ready) return;

    let alive = true;
    (async () => {
      try {
        const v = await isOnboarded();
        if (alive) setDone(v);
      } catch {
        if (alive) setDone(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [ready]);

  if (!ready || done === null) return null;

  // ✅ if not done, show Welcome and mark done when it finishes
  if (!done) {
    return <Welcome onDone={() => setDone(true)} />;
  }

  return children;
}