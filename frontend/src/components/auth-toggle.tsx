import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface AuthToggleProps {
  isLogin: boolean;
  onToggle: (isLogin: boolean) => void;
}

export function AuthToggle({ isLogin, onToggle }: AuthToggleProps) {
  return (
    <div className="flex bg-gray-100 p-1 rounded-lg mb-6">
      <Button
        type="button"
        variant={isLogin ? "default" : "ghost"}
        className={cn(
          "flex-1 rounded-md transition-all",
          isLogin ? "bg-white shadow-sm" : "hover:bg-gray-200"
        )}
        onClick={() => onToggle(true)}
      >
        Sign In
      </Button>
      <Button
        type="button"
        variant={!isLogin ? "default" : "ghost"}
        className={cn(
          "flex-1 rounded-md transition-all",
          !isLogin ? "bg-white shadow-sm" : "hover:bg-gray-200"
        )}
        onClick={() => onToggle(false)}
      >
        Sign Up
      </Button>
    </div>
  );
}