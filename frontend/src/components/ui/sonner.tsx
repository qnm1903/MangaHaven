import { useTheme } from "next-themes"
import { Toaster as Sonner, type ToasterProps } from "sonner"

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--error-bg": "#ef4444",
          "--error-text": "#ffffff",
          "--error-border": "#dc2626",
          "--success-bg": "#22c55e",
          "--success-text": "#ffffff", 
          "--success-border": "#16a34a",
          "--warning-bg": "#f59e0b",
          "--warning-text": "#ffffff",
          "--warning-border": "#d97706",
          "--info-bg": "#3b82f6",
          "--info-text": "#ffffff",
          "--info-border": "#2563eb",
        } as React.CSSProperties
      }
      toastOptions={{
        style: {
          background: "var(--normal-bg)",
          color: "var(--normal-text)",
          border: "1px solid var(--normal-border)",
        },
        classNames: {
          error: "!bg-red-500 !text-white !border-red-600",
          success: "!bg-green-500 !text-white !border-green-600", 
          warning: "!bg-yellow-500 !text-white !border-yellow-600",
          info: "!bg-blue-500 !text-white !border-blue-600",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
