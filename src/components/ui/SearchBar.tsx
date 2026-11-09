import { Search, X } from 'lucide-react'

interface SearchBarProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

export function SearchBar({ value, onChange, placeholder = 'Buscar…' }: SearchBarProps) {
  return (
    <div className="search">
      <Search aria-hidden />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label="Buscar"
      />
      {value && (
        <button type="button" className="search__clear" onClick={() => onChange('')} aria-label="Limpar busca">
          <X aria-hidden />
        </button>
      )}
    </div>
  )
}
