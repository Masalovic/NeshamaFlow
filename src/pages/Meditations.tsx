// src/routes/Meditations.tsx
import React, { useEffect, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import MeditationPlay from "../components/MeditationPlay";

export default function Meditations() {
  const { search } = useLocation();
  const navigate = useNavigate();

  // read ?id=...
  const params = useMemo(() => new URLSearchParams(search), [search]);
  const id = params.get("id");

  // if someone opens /meditations without id -> send them to Flows
  useEffect(() => {
    if (!id) {
      navigate("/flows", { replace: true });
    }
  }, [id, navigate]);

  // while redirecting, render nothing
  if (!id) return null;

  // with id -> show the real player (the one with audio + ambience)
  return <MeditationPlay />;
}
