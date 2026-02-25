import { createLazyFileRoute, Navigate } from "@tanstack/react-router";
import { useAtomValue } from "jotai";
import { authStateAtom } from "../store/authAtoms";
import Auth from "../pages/Auth";

function GuestOnlyAuth() {
  const { user, loading } = useAtomValue(authStateAtom);

  // Đang khởi tạo auth -> chờ, không redirect vội
  if (loading) return null;

  // Đã đăng nhập -> về trang chủ
  if (user) return <Navigate to="/" replace />;

  return <Auth />;
}

export const Route = createLazyFileRoute("/auth")({
  component: GuestOnlyAuth,
});
