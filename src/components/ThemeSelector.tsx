import { useUserTheme } from '@/hooks/useUserTheme';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Palette } from 'lucide-react';

const themeColors = [
  { name: 'Blauw', color: '#3b82f6' },
  { name: 'Groen', color: '#10b981' },
  { name: 'Paars', color: '#8b5cf6' },
  { name: 'Rood', color: '#ef4444' },
  { name: 'Oranje', color: '#f97316' },
  { name: 'Geel', color: '#eab308' },
  { name: 'Roze', color: '#ec4899' },
];

export const ThemeSelector = () => {
  const { accentColor, updateTheme } = useUserTheme();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon">
          <Palette className="h-5 w-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Thema Kleur</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <div className="grid grid-cols-4 gap-2 p-2">
          {themeColors.map((theme) => (
            <button
              key={theme.color}
              onClick={() => updateTheme(theme.color)}
              className="group relative flex items-center justify-center"
              title={theme.name}
            >
              <div
                className="w-10 h-10 rounded-full transition-all hover:scale-110"
                style={{
                  backgroundColor: theme.color,
                  boxShadow: accentColor === theme.color 
                    ? `0 0 0 2px hsl(var(--background)), 0 0 0 4px ${theme.color}`
                    : 'none',
                }}
              />
              <span className="sr-only">{theme.name}</span>
            </button>
          ))}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
