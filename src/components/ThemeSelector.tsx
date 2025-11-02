import { useUserTheme } from '@/hooks/useUserTheme';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Palette className="h-5 w-5" />
          Persoonlijk Thema
        </CardTitle>
        <CardDescription>
          Kies je eigen accent kleur voor borders en highlights
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-7 gap-3">
          {themeColors.map((theme) => (
            <button
              key={theme.color}
              onClick={() => updateTheme(theme.color)}
              className="group relative"
              title={theme.name}
            >
              <div
                className="w-12 h-12 rounded-full transition-all hover:scale-110"
                style={{
                  backgroundColor: theme.color,
                  boxShadow: accentColor === theme.color 
                    ? `0 0 0 4px hsl(var(--background)), 0 0 0 6px ${theme.color}`
                    : 'none',
                }}
              />
              <span className="sr-only">{theme.name}</span>
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
