import { ReactNode } from 'react'

export function Status({ text, tone = 'muted' }: { text: string, tone?: string }) {
  return <span className={`status ${tone}`}><i aria-hidden="true" /> <code>{text}</code></span>
}

export function Card({ children, className = '' }: { children: ReactNode, className?: string }) {
  return <section className={`card ${className}`}>{children}</section>
}

export function Page({ title, note, actions, children }: { title: string, note?: string, actions?: ReactNode, children: ReactNode }) {
  return <div className="page"><header className="page-head"><div><h1>{title}</h1>{note && <p>{note}</p>}</div><div className="actions">{actions}</div></header>{children}</div>
}

export function Button({ children, onClick, kind = 'primary', disabled = false, type = 'button' }: { children: ReactNode, onClick?: () => void, kind?: 'primary' | 'quiet' | 'danger', disabled?: boolean, type?: 'button' | 'submit' }) {
  return <button type={type} disabled={disabled} onClick={onClick} className={`button ${kind}`}>{children}</button>
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="empty">{children}</div>
}

export function ErrorBox({ value, retry }: { value: string, retry?: () => void }) {
  return <div className="error"><span>{value}</span>{retry && <Button kind="quiet" onClick={retry}>Retry</Button>}</div>
}
