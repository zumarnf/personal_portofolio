import { Moon, Sun } from 'lucide-react'

export default function ThemeToggle({ toggleTheme, theme }) {
  return (
    <button
      onClick={toggleTheme}
      className="fixed top-6 right-6 z-50 p-3 rounded-full bg-card border border-border hover:bg-muted transition-colors md:hidden"
      aria-label="Toggle theme"
    >
      {theme === 'light' ? (
        <Moon className="w-5 h-5" />
      ) : (
        <Sun className="w-5 h-5" />
      )}
    </button>
  )
}
