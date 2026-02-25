// frontend/src/routes/favorites.lazy.tsx
import { createLazyFileRoute } from "@tanstack/react-router";
import Favorites from "../pages/Favorites";

export const Route = createLazyFileRoute("/favorites")({
  component: Favorites,
});
