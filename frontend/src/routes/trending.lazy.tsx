// frontend/src/routes/trending.lazy.tsx
import { createLazyFileRoute } from "@tanstack/react-router";
import Trending from "../pages/Trending";

export const Route = createLazyFileRoute("/trending")({
  component: Trending,
});
