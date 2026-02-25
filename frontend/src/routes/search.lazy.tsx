// frontend/src/routes/search.lazy.tsx
import { createLazyFileRoute } from "@tanstack/react-router";
import AdvancedSearch from "../pages/AdvancedSearch";

export const Route = createLazyFileRoute("/search")({
    component: AdvancedSearch,
});
