// src/routes/Meditations.tsx
import React, { useEffect, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import MeditationPlay from "../components/MeditationPlay";

export default function Meditations() {
  const { search } = useLocation();
  const navigate = useNavigate();

  const params = useMemo(() => new URLSearchParams(search), [search]);
  const id = params.get("id");

  useEffect(() => {
    if (!id) navigate("/flows", { replace: true });
  }, [id, navigate]);

  if (!id) return null;

  // ✅ pass id explicitly (more reliable than hidden URL reading)
  return <MeditationPlay id={id} />;
}