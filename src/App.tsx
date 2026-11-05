import { useEffect, useMemo, useState, type FormEvent } from 'react'
import {
  Heart, BookHeart, MapPin, Plus, Search, LogOut, Camera, CalendarDays,
  ExternalLink, Check, Clock3, Sparkles, X, ImagePlus, Trash2, Pencil, Cloud,
  LockKeyhole, ArrowRight, Leaf
} from 'lucide-react'
import { isSupabaseConfigured, supabase } from './lib/supabase'
import type { Experience, Memory } from './types'

type Tab = 'memories' | 'wishes'
type Modal = 'memory' | 'experience' | null

const categories = ['Gastronomia', 'Passeio', 'Viagem', 'Natureza', 'Cultura', 'Aventura', 'Outro']
const statusLabels = { wish: 'Queremos ir', planned: 'Planejado', done: 'Realizado' }

const demoMemories: Memory[] = [
  { id: 'demo-m1', title: 'Um dia para guardar', description: 'Aqueles momentos simples que acabam se tornando inesquecíveis.', memory_date: '2026-07-12', photo_url: null },
]
const demoExperiences: Experience[] = [
  { id: 'demo-e1', title: 'Aquele restaurante que salvamos', category: 'Gastronomia', source_url: '', description: 'Adicionar aqui o link e o motivo para conhecer.', status: 'wish' },
]

function App() {
  const [tab, setTab] = useState<Tab>('memories')
  const [memories, setMemories] = useState<Memory[]>([])
  const [experiences, setExperiences] = useState<Experience[]>([])
  const [modal, setModal] = useState<Modal>(null)
  const [editingMemory, setEditingMemory] = useState<Memory | null>(null)
  const [editingExperience, setEditingExperience] = useState<Experience | null>(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [loading, setLoading] = useState(false)
  const [userEmail, setUserEmail] = useState('')
  const [sessionReady, setSessionReady] = useState(!isSupabaseConfigured)
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login')
  const [authEmail, setAuthEmail] = useState('')
  const [authPassword, setAuthPassword] = useState('')
  const [authMessage, setAuthMessage] = useState('')
  const [notice, setNotice] = useState('')
  const [activeMemory, setActiveMemory] = useState<Memory | null>(null)

  const demoMode = !isSupabaseConfigured

  useEffect(() => {
    if (!supabase) {
      const savedM = localStorage.getItem('nc_memories')
      const savedE = localStorage.getItem('nc_experiences')
      setMemories(savedM ? JSON.parse(savedM) : demoMemories)
      setExperiences(savedE ? JSON.parse(savedE) : demoExperiences)
      return
    }
    supabase.auth.getSession().then(({ data }) => {
      setUserEmail(data.session?.user.email ?? '')
      setSessionReady(true)
    })
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserEmail(session?.user.email ?? '')
      setSessionReady(true)
    })
    return () => listener.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (demoMode) {
      localStorage.setItem('nc_memories', JSON.stringify(memories))
      return
    }
    if (userEmail) void loadData()
  }, [memories, demoMode, userEmail])

  useEffect(() => {
    if (demoMode) {
      localStorage.setItem('nc_experiences', JSON.stringify(experiences))
      return
    }
    if (userEmail) void loadData()
  }, [experiences, demoMode, userEmail])

  async function loadData() {
    if (!supabase) return
    setLoading(true)
    const [m, e] = await Promise.all([
      supabase.from('memories').select('*').order('memory_date', { ascending: false }),
      supabase.from('experiences').select('*').order('created_at', { ascending: false }),
    ])
    if (!m.error && m.data) setMemories(m.data as Memory[])
    if (!e.error && e.data) setExperiences(e.data as Experience[])
    setLoading(false)
  }

  async function authenticate(event: FormEvent) {
    event.preventDefault()
    if (!supabase) return
    setAuthMessage('')
    const result = authMode === 'signup'
      ? await supabase.auth.signUp({ email: authEmail, password: authPassword })
      : await supabase.auth.signInWithPassword({ email: authEmail, password: authPassword })
    if (result.error) setAuthMessage(result.error.message)
    else if (authMode === 'signup') setAuthMessage('Conta criada! Confira seu e-mail para confirmar o cadastro, se solicitado.')
  }

  async function signOut() {
    await supabase?.auth.signOut()
    setMemories([])
    setExperiences([])
  }

  async function saveMemory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const file = form.get('photo') as File
    const payload = {
      title: String(form.get('title') || '').trim(),
      description: String(form.get('description') || '').trim(),
      memory_date: String(form.get('memory_date') || '') || null,
    }
    if (!payload.title) return
    if (demoMode) {
      const photo_url = file?.size ? URL.createObjectURL(file) : editingMemory?.photo_url ?? null
      const item: Memory = { id: editingMemory?.id ?? crypto.randomUUID(), ...payload, photo_url }
      setMemories(old => editingMemory ? old.map(x => x.id === item.id ? item : x) : [item, ...old])
      setNotice('Memória salva neste dispositivo.')
    } else if (supabase) {
      let photo_url = editingMemory?.photo_url ?? null
      if (file?.size) {
        const path = `${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '-')}`
        const upload = await supabase.storage.from('memory-photos').upload(path, file, { upsert: false })
        if (upload.error) { setNotice(`Erro no envio da foto: ${upload.error.message}`); return }
        photo_url = path
      }
      const row = { ...payload, photo_url }
      const result = editingMemory
        ? await supabase.from('memories').update(row).eq('id', editingMemory.id)
        : await supabase.from('memories').insert(row)
      if (result.error) { setNotice(`Não foi possível salvar: ${result.error.message}`); return }
      await loadData()
      setNotice('Memória salva!')
    }
    setModal(null)
    setEditingMemory(null)
  }

  async function saveExperience(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const payload = {
      title: String(form.get('title') || '').trim(),
      category: String(form.get('category') || 'Outro'),
      source_url: String(form.get('source_url') || '').trim(),
      description: String(form.get('description') || '').trim(),
      status: String(form.get('status') || 'wish') as Experience['status'],
    }
    if (!payload.title) return
    if (demoMode) {
      const item: Experience = { id: editingExperience?.id ?? crypto.randomUUID(), ...payload }
      setExperiences(old => editingExperience ? old.map(x => x.id === item.id ? item : x) : [item, ...old])
      setNotice('Item salvo neste dispositivo.')
    } else if (supabase) {
      const result = editingExperience
        ? await supabase.from('experiences').update(payload).eq('id', editingExperience.id)
        : await supabase.from('experiences').insert(payload)
      if (result.error) { setNotice(`Não foi possível salvar: ${result.error.message}`); return }
      await loadData()
      setNotice('Experiência salva!')
    }
    setModal(null)
    setEditingExperience(null)
  }

  async function deleteMemory(item: Memory) {
    if (!confirm(`Excluir a memória “${item.title}”?`)) return
    if (!demoMode && supabase) {
      const { error } = await supabase.from('memories').delete().eq('id', item.id)
      if (error) { setNotice(error.message); return }
      await loadData()
    } else setMemories(old => old.filter(x => x.id !== item.id))
    setActiveMemory(null)
    setNotice('Memória excluída.')
  }

  async function deleteExperience(item: Experience) {
    if (!confirm(`Excluir “${item.title}”?`)) return
    if (!demoMode && supabase) {
      const { error } = await supabase.from('experiences').delete().eq('id', item.id)
      if (error) { setNotice(error.message); return }
      await loadData()
    } else setExperiences(old => old.filter(x => x.id !== item.id))
    setNotice('Item excluído.')
  }

  async function updateStatus(item: Experience, status: Experience['status']) {
    if (demoMode) setExperiences(old => old.map(x => x.id === item.id ? { ...x, status } : x))
    else if (supabase) {
      const { error } = await supabase.from('experiences').update({ status }).eq('id', item.id)
      if (error) setNotice(error.message)
      else await loadData()
    }
  }

  const filteredExperiences = useMemo(() => experiences.filter(item => {
    const matchesSearch = `${item.title} ${item.category} ${item.description}`.toLowerCase().includes(search.toLowerCase())
    return matchesSearch && (statusFilter === 'all' || item.status === statusFilter)
  }), [experiences, search, statusFilter])

  if (!sessionReady) return <div className="loading-screen">Preparando nosso cantinho…</div>

  if (!demoMode && !userEmail) return (
    <main className="auth-page">
      <div className="auth-card">
        <div className="brand-mark"><Heart size={23} fill="currentColor" /></div>
        <p className="eyebrow">UM ESPAÇO SÓ DE VOCÊS</p>
        <h1>Nosso Cantinho</h1>
        <p className="muted">Um lugar para guardar o que vivemos e planejar tudo o que ainda queremos viver.</p>
        <form onSubmit={authenticate} className="form-stack">
          <label>E-mail<input type="email" value={authEmail} onChange={e => setAuthEmail(e.target.value)} required /></label>
          <label>Senha<input type="password" value={authPassword} onChange={e => setAuthPassword(e.target.value)} minLength={6} required /></label>
          <button className="primary-button full" type="submit">{authMode === 'login' ? 'Entrar' : 'Criar conta'}</button>
        </form>
        {authMessage && <p className="form-message">{authMessage}</p>}
        <button className="text-button" onClick={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')}>
          {authMode === 'login' ? 'Ainda não temos uma conta? Criar conta' : 'Já temos uma conta? Entrar'}
        </button>
      </div>
    </main>
  )

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="#" onClick={e => { e.preventDefault(); setTab('memories') }}>
          <span className="brand-mark small"><Heart size={17} fill="currentColor" /></span>
          <span>nosso <strong>cantinho</strong></span>
        </a>
        <div className="top-actions">
          {demoMode ? <span className="demo-pill"><Sparkles size={13}/> Modo demonstração</span> : <span className="user-email">{userEmail}</span>}
          {!demoMode && <button className="icon-button" title="Sair" onClick={signOut}><LogOut size={17}/></button>}
        </div>
      </header>

      <main className="content">
        <section className="welcome">
          <div>
            <p className="eyebrow">UM ESPAÇO PARA NÓS DOIS</p>
            <h1>O que vamos guardar <em>hoje?</em></h1>
            <p className="welcome-copy">Um cantinho para lembrar do que vivemos e planejar tudo o que ainda queremos viver.</p>
          </div>
          <div className="welcome-art"><Heart size={39} strokeWidth={1.2}/><span>feito com carinho</span></div>
        </section>

        <nav className="tabs" aria-label="Seções">
          <button className={tab === 'memories' ? 'tab active' : 'tab'} onClick={() => setTab('memories')}><BookHeart size={17}/> Nossas memórias <span>{memories.length}</span></button>
          <button className={tab === 'wishes' ? 'tab active' : 'tab'} onClick={() => setTab('wishes')}><MapPin size={17}/> Lista de desejos <span>{experiences.length}</span></button>
        </nav>

        {tab === 'memories' ? (
          <section>
            <div className="section-heading">
              <div><h2>Pequenos momentos, grandes lembranças.</h2><p>O que merece continuar pertinho da gente.</p></div>
              <button className="primary-button" onClick={() => { setEditingMemory(null); setModal('memory') }}><Plus size={17}/> Nova memória</button>
            </div>
            {loading ? <p className="empty-state">Carregando memórias…</p> : memories.length === 0 ? (
              <div className="empty-state"><BookHeart size={31}/><h3>Nosso álbum começa aqui</h3><p>Adicione uma lembrança especial para inaugurar este espaço.</p><button className="secondary-button" onClick={() => setModal('memory')}>Adicionar primeira memória</button></div>
            ) : <div className="memory-grid">
              {memories.map(item => <article className="memory-card" key={item.id}>
                <button className="memory-photo" onClick={() => setActiveMemory(item)} aria-label={`Abrir ${item.title}`}>
                  {item.photo_url ? <img src={demoMode ? item.photo_url : undefined} alt="" /> : <div className="photo-placeholder"><Camera size={27}/><span>uma lembrança especial</span></div>}
                </button>
                <div className="memory-body">
                  <div className="date-line"><CalendarDays size={13}/>{item.memory_date ? new Date(`${item.memory_date}T12:00:00`).toLocaleDateString('pt-BR') : 'Sem data'}</div>
                  <h3>{item.title}</h3><p>{item.description || 'Uma lembrança para guardar com carinho.'}</p>
                  <div className="card-actions"><button onClick={() => { setEditingMemory(item); setModal('memory') }}><Pencil size={14}/> Editar</button><button onClick={() => setActiveMemory(item)}>Ver memória <ArrowRight size={14}/></button></div>
                </div>
              </article>)}
            </div>}
          </section>
        ) : (
          <section>
            <div className="section-heading">
              <div><h2>Planos que ainda vamos viver.</h2><p>Para aquela ideia que não queremos esquecer.</p></div>
              <button className="primary-button" onClick={() => { setEditingExperience(null); setModal('experience') }}><Plus size={17}/> Adicionar ideia</button>
            </div>
            <div className="filters">
              <div className="search-box"><Search size={16}/><input placeholder="Buscar na nossa lista…" value={search} onChange={e => setSearch(e.target.value)}/></div>
              <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} aria-label="Filtrar por status">
                <option value="all">Todos os status</option><option value="wish">Queremos ir</option><option value="planned">Planejado</option><option value="done">Realizado</option>
              </select>
            </div>
            {filteredExperiences.length === 0 ? <div className="empty-state"><MapPin size={31}/><h3>Nenhum plano por aqui ainda</h3><p>Salve aquele restaurante, passeio ou experiência que vocês vivem dizendo que precisam conhecer.</p><button className="secondary-button" onClick={() => setModal('experience')}>Adicionar primeira ideia</button></div> :
              <div className="experience-grid">{filteredExperiences.map(item => <article className="experience-card" key={item.id}>
                <div className="experience-icon"><Leaf size={23}/></div>
                <div className="experience-content"><div className="experience-meta"><span>{item.category}</span><span className={`status status-${item.status}`}>{statusLabels[item.status]}</span></div>
                  <h3>{item.title}</h3><p>{item.description || 'Uma ideia para nosso próximo capítulo.'}</p>
                  {item.source_url && <a className="source-link" href={item.source_url} target="_blank" rel="noreferrer">Ver inspiração <ExternalLink size={13}/></a>}
                  <div className="experience-footer">
                    <select value={item.status} onChange={e => updateStatus(item, e.target.value as Experience['status'])} aria-label={`Status de ${item.title}`}><option value="wish">Queremos ir</option><option value="planned">Planejado</option><option value="done">Realizado</option></select>
                    <button className="icon-button" title="Editar" onClick={() => { setEditingExperience(item); setModal('experience') }}><Pencil size={15}/></button>
                    <button className="icon-button danger" title="Excluir" onClick={() => deleteExperience(item)}><Trash2 size={15}/></button>
                  </div>
                </div>
              </article>)}</div>}
          </section>
        )}
        <footer><Heart size={13} fill="currentColor"/> Um lugar para o que vivemos e tudo o que ainda vem pela frente.</footer>
      </main>

      {notice && <div className="toast" role="status">{notice}<button onClick={() => setNotice('')}><X size={15}/></button></div>}

      {modal && <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) { setModal(null); setEditingMemory(null); setEditingExperience(null) } }}>
        <div className="modal">
          <div className="modal-heading"><div><p className="eyebrow">{modal === 'memory' ? 'GUARDAR UM MOMENTO' : 'PLANEJAR ALGO JUNTOS'}</p><h2>{modal === 'memory' ? (editingMemory ? 'Editar memória' : 'Nova memória') : (editingExperience ? 'Editar ideia' : 'Nova ideia')}</h2></div><button className="icon-button" onClick={() => setModal(null)}><X/></button></div>
          {modal === 'memory' ? <form className="form-stack" onSubmit={saveMemory}>
            <label>Título<input name="title" defaultValue={editingMemory?.title} placeholder="Ex.: Nosso domingo no parque" required/></label>
            <label>Data<input type="date" name="memory_date" defaultValue={editingMemory?.memory_date ?? ''}/></label>
            <label>O que aconteceu?<textarea name="description" defaultValue={editingMemory?.description} rows={4} placeholder="Conte um pouquinho sobre esse momento…"/></label>
            <label className="file-field"><ImagePlus size={18}/> <span>{editingMemory?.photo_url ? 'Escolher outra fotografia' : 'Adicionar uma fotografia'}</span><input type="file" name="photo" accept="image/*"/></label>
            <button className="primary-button full" type="submit"><Heart size={16}/> Salvar memória</button>
          </form> : <form className="form-stack" onSubmit={saveExperience}>
            <label>Nome<input name="title" defaultValue={editingExperience?.title} placeholder="Ex.: Aquele restaurante italiano" required/></label>
            <label>Categoria<select name="category" defaultValue={editingExperience?.category ?? 'Gastronomia'}>{categories.map(c => <option key={c}>{c}</option>)}</select></label>
            <label>Link de onde encontramos<input name="source_url" type="url" defaultValue={editingExperience?.source_url} placeholder="https://…"/></label>
            <label>Por que queremos conhecer?<textarea name="description" defaultValue={editingExperience?.description} rows={3} placeholder="O que chamou nossa atenção?"/></label>
            <label>Status<select name="status" defaultValue={editingExperience?.status ?? 'wish'}><option value="wish">Queremos ir</option><option value="planned">Planejado</option><option value="done">Realizado</option></select></label>
            <button className="primary-button full" type="submit"><Heart size={16}/> Salvar ideia</button>
          </form>}
        </div>
      </div>}

      {activeMemory && <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) setActiveMemory(null) }}><div className="modal memory-detail">
        <div className="modal-heading"><div><p className="eyebrow">UMA LEMBRANÇA NOSSA</p><h2>{activeMemory.title}</h2></div><button className="icon-button" onClick={() => setActiveMemory(null)}><X/></button></div>
        {activeMemory.photo_url && demoMode && <img className="detail-image" src={activeMemory.photo_url} alt="Fotografia da memória"/>}
        <p className="date-line"><CalendarDays size={14}/>{activeMemory.memory_date ? new Date(`${activeMemory.memory_date}T12:00:00`).toLocaleDateString('pt-BR') : 'Sem data'}</p>
        <p className="detail-description">{activeMemory.description}</p>
        <div className="detail-actions"><button className="secondary-button" onClick={() => { setEditingMemory(activeMemory); setActiveMemory(null); setModal('memory') }}><Pencil size={15}/> Editar</button><button className="secondary-button delete-button" onClick={() => deleteMemory(activeMemory)}><Trash2 size={15}/> Excluir</button></div>
      </div></div>}
    </div>
  )
}

export default App
