interface Option {
  id: string
  label: string
  hint?: string
}

interface CheckboxDropdownProps {
  legend: string
  options: Option[]
  selected: string[]
  onChange: (ids: string[]) => void
  /** Texto do resumo quando há itens marcados, ex.: (2) => '2 memórias vinculadas'. */
  summary: (count: number) => string
  emptyText: string
}

/** Lista recolhível de checkboxes para vínculos N:N (feedback ↔ memórias/desejos). */
export function CheckboxDropdown({ legend, options, selected, onChange, summary, emptyText }: CheckboxDropdownProps) {
  const toggle = (id: string, checked: boolean) =>
    onChange(checked ? [...selected, id] : selected.filter((x) => x !== id))

  return (
    <fieldset className="field-group">
      <legend>{legend}</legend>
      {options.length === 0 ? (
        <p className="field-hint">{emptyText}</p>
      ) : (
        <details className="dropdown">
          <summary>
            {selected.length ? summary(selected.length) : 'Selecionar (opcional)'}
          </summary>
          <div className="dropdown__options">
            {options.map((option) => (
              <label className="check" key={option.id}>
                <input
                  type="checkbox"
                  checked={selected.includes(option.id)}
                  onChange={(e) => toggle(option.id, e.target.checked)}
                />
                <span>
                  {option.label}
                  {option.hint && <small className="check__hint"> · {option.hint}</small>}
                </span>
              </label>
            ))}
          </div>
        </details>
      )}
    </fieldset>
  )
}
