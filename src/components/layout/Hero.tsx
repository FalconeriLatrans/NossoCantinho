import { Heart } from 'lucide-react'

export function Hero() {
  return (
    <section className="hero">
      <div>
        <p className="eyebrow">Um espaço para nós dois</p>
        <h1>
          O que vamos guardar <em>hoje?</em>
        </h1>
        <p className="hero__lead">Um cantinho para lembrar do que vivemos e planejar tudo o que ainda queremos viver.</p>
      </div>
      <div className="hero__art" aria-hidden>
        <Heart />
        <span>feito com carinho</span>
      </div>
    </section>
  )
}
