import { Monitor, Moon, Sun } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useThemeStore } from "@/stores/theme-store";

export function AppHeaderThemeToggle() {
  const theme = useThemeStore((state) => state.theme);
  const toggleTheme = useThemeStore((state) => state.toggleTheme);

  const getIcon = () => {
    switch (theme) {
      case "light":
        return <Sun className="h-4 w-4" />;
      case "dark":
        return <Moon className="h-4 w-4" />;
      case "system":
        return <Monitor className="h-4 w-4" />;
    }
  };

  const getTooltip = () => {
    switch (theme) {
      case "light":
        return "Light mode - Click for dark";
      case "dark":
        return "Dark mode - Click for system";
      case "system":
        return "System mode - Click for light";
    }
  };

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      className="h-8 w-8 rounded-full border border-border/60 bg-background/95 shadow-xs"
      onClick={toggleTheme}
      title={getTooltip()}
    >
      {getIcon()}
    </Button>
  );
}
