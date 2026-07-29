# Lembrar Email no Login Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "Lembrar meu email" checkbox to `LoginPage` that persists (only) the email in `localStorage` on successful login, and pre-fills it on the next visit — for users who rely on an external password manager instead of the browser's own autofill.

**Architecture:** A new `src/features/auth/useRememberedEmail.ts` hook wraps a single `localStorage` key (`apontilinkcenter:remembered-email`) behind a `{ rememberedEmail, remember, forget }` API. `LoginPage.tsx` seeds `react-hook-form`'s `defaultValues` from that hook, adds a `rememberEmail: z.boolean()` field to its Zod schema, renders a new shadcn `Checkbox` (Base UI, wired via `Controller` since it exposes `checked`/`onCheckedChange`, not a native `onChange`), and calls `remember`/`forget` from inside `onSubmit`, only after `signInWithPassword` succeeds.

**Tech Stack:** React 19, react-hook-form + Zod, `@base-ui/react` (via shadcn `base-nova` style), Vitest + Testing Library.

Reference spec: `docs/superpowers/specs/2026-07-29-lembrar-email-login-design.md`

---

### Task 1: `useRememberedEmail` hook

**Files:**
- Create: `src/features/auth/useRememberedEmail.ts`
- Test: `src/features/auth/useRememberedEmail.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// src/features/auth/useRememberedEmail.test.tsx
import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useRememberedEmail } from './useRememberedEmail'

const STORAGE_KEY = 'apontilinkcenter:remembered-email'

describe('useRememberedEmail', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('retorna null quando nao ha email salvo', () => {
    const { result } = renderHook(() => useRememberedEmail())
    expect(result.current.rememberedEmail).toBeNull()
  })

  it('le um valor pre-existente do localStorage no mount inicial', () => {
    localStorage.setItem(STORAGE_KEY, 'saved@aponti.local')
    const { result } = renderHook(() => useRememberedEmail())
    expect(result.current.rememberedEmail).toBe('saved@aponti.local')
  })

  it('remember grava no localStorage e atualiza o estado', () => {
    const { result } = renderHook(() => useRememberedEmail())

    act(() => {
      result.current.remember('dev@aponti.local')
    })

    expect(result.current.rememberedEmail).toBe('dev@aponti.local')
    expect(localStorage.getItem(STORAGE_KEY)).toBe('dev@aponti.local')
  })

  it('forget remove do localStorage e volta o estado para null', () => {
    localStorage.setItem(STORAGE_KEY, 'dev@aponti.local')
    const { result } = renderHook(() => useRememberedEmail())

    act(() => {
      result.current.forget()
    })

    expect(result.current.rememberedEmail).toBeNull()
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- useRememberedEmail`
Expected: FAIL — `Cannot find module './useRememberedEmail'` (or similar resolution error), since the hook file doesn't exist yet.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/features/auth/useRememberedEmail.ts
import { useState } from 'react'

const STORAGE_KEY = 'apontilinkcenter:remembered-email'

export function useRememberedEmail() {
  const [rememberedEmail, setRememberedEmail] = useState<string | null>(() =>
    localStorage.getItem(STORAGE_KEY),
  )

  function remember(email: string) {
    localStorage.setItem(STORAGE_KEY, email)
    setRememberedEmail(email)
  }

  function forget() {
    localStorage.removeItem(STORAGE_KEY)
    setRememberedEmail(null)
  }

  return { rememberedEmail, remember, forget }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- useRememberedEmail`
Expected: PASS — all 4 tests green.

- [ ] **Step 5: Commit**

```bash
git add src/features/auth/useRememberedEmail.ts src/features/auth/useRememberedEmail.test.tsx
git commit -m "feat: adiciona hook useRememberedEmail para lembrar email do login"
```

---

### Task 2: Instalar o componente `Checkbox` (shadcn)

**Files:**
- Create (via CLI, not by hand): `src/components/ui/checkbox.tsx`

- [ ] **Step 1: Rodar o CLI do shadcn**

Run: `npx shadcn@latest add checkbox --yes`
Expected: creates `src/components/ui/checkbox.tsx` exporting a `Checkbox` component built on `@base-ui/react/checkbox` (`CheckboxPrimitive.Root` + `.Indicator`), same `base-nova` style already used by `Switch`/`Avatar`/`Collapsible`. No other files should change (if the CLI also touches `package.json`, that's expected — it adds `@base-ui/react`'s checkbox export, already covered by the existing `@base-ui/react` dependency, so no new package should actually be installed).

- [ ] **Step 2: Confirmar que o componente foi gerado corretamente**

Run: `cat src/components/ui/checkbox.tsx`
Expected: a file exporting `Checkbox`, whose root element renders `role="checkbox"` (via `@base-ui/react/checkbox`'s `CheckboxRoot`, confirmed in `node_modules/@base-ui/react/checkbox/root/CheckboxRoot.js`) and accepts `checked`/`onCheckedChange`/`aria-label` props (not a native `onChange`).

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: PASS — no new type errors introduced by the generated file.

- [ ] **Step 4: Commit**

```bash
git add src/components/ui/checkbox.tsx package.json package-lock.json
git commit -m "feat: adiciona componente Checkbox via shadcn CLI"
```

---

### Task 3: Checkbox "Lembrar meu email" no `LoginPage`

**Files:**
- Modify: `src/routes/login/LoginPage.tsx`
- Modify: `src/routes/login/LoginPage.test.tsx`

- [ ] **Step 1: Write the failing tests (extend the existing test file)**

Replace the top of `src/routes/login/LoginPage.test.tsx` (imports + mocks + `beforeEach`) with:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'

const navigateMock = vi.fn()
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>()
  return { ...actual, useNavigate: () => navigateMock }
})

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      signInWithPassword: vi.fn(),
    },
  },
}))

const rememberMock = vi.fn()
const forgetMock = vi.fn()
let mockRememberedEmail: string | null = null
vi.mock('@/features/auth/useRememberedEmail', () => ({
  useRememberedEmail: () => ({
    rememberedEmail: mockRememberedEmail,
    remember: rememberMock,
    forget: forgetMock,
  }),
}))

import { supabase } from '@/lib/supabase'
import LoginPage from './LoginPage'

function renderLogin() {
  return render(
    <MemoryRouter>
      <LoginPage />
    </MemoryRouter>,
  )
}

describe('LoginPage', () => {
  beforeEach(() => {
    navigateMock.mockClear()
    rememberMock.mockClear()
    forgetMock.mockClear()
    mockRememberedEmail = null
    vi.mocked(supabase.auth.signInWithPassword).mockReset()
  })
```

Keep every existing `it(...)` block in the file unchanged (they still pass with `mockRememberedEmail = null`), and add these four new ones before the closing `})` of the `describe` block:

```tsx
  it('pre-preenche o email e marca o checkbox quando ha email salvo', () => {
    mockRememberedEmail = 'saved@aponti.local'
    renderLogin()

    expect(screen.getByLabelText('Email')).toHaveValue('saved@aponti.local')
    expect(screen.getByRole('checkbox', { name: /lembrar meu email/i })).toBeChecked()
  })

  it('chama remember com o email apos login bem sucedido com o checkbox marcado', async () => {
    vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({
      data: { session: {}, user: {} },
      error: null,
    } as never)
    const user = userEvent.setup()
    renderLogin()

    await user.type(screen.getByLabelText('Email'), 'dev@aponti.local')
    await user.type(screen.getByLabelText('Senha'), 'Test1234!aponti')
    await user.click(screen.getByRole('checkbox', { name: /lembrar meu email/i }))
    await user.click(screen.getByRole('button', { name: /entrar/i }))

    await screen.findByRole('button', { name: /^entrar$/i })
    expect(rememberMock).toHaveBeenCalledWith('dev@aponti.local')
    expect(forgetMock).not.toHaveBeenCalled()
  })

  it('chama forget apos login bem sucedido com o checkbox desmarcado', async () => {
    vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({
      data: { session: {}, user: {} },
      error: null,
    } as never)
    const user = userEvent.setup()
    renderLogin()

    await user.type(screen.getByLabelText('Email'), 'dev@aponti.local')
    await user.type(screen.getByLabelText('Senha'), 'Test1234!aponti')
    await user.click(screen.getByRole('button', { name: /entrar/i }))

    await screen.findByRole('button', { name: /^entrar$/i })
    expect(forgetMock).toHaveBeenCalled()
    expect(rememberMock).not.toHaveBeenCalled()
  })

  it('nao chama remember nem forget quando as credenciais sao invalidas', async () => {
    vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({
      data: { session: null, user: null },
      error: { message: 'Invalid login credentials' },
    } as never)
    const user = userEvent.setup()
    renderLogin()

    await user.type(screen.getByLabelText('Email'), 'dev@aponti.local')
    await user.type(screen.getByLabelText('Senha'), 'wrong-password')
    await user.click(screen.getByRole('checkbox', { name: /lembrar meu email/i }))
    await user.click(screen.getByRole('button', { name: /entrar/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Email ou senha inválidos.')
    expect(rememberMock).not.toHaveBeenCalled()
    expect(forgetMock).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run tests to verify the new ones fail**

Run: `npm run test -- LoginPage`
Expected: FAIL — the 4 new tests fail (no checkbox with accessible name "lembrar meu email" exists yet; `rememberMock`/`forgetMock` are never called). The pre-existing tests should still pass at this point since `LoginPage.tsx` hasn't changed yet.

- [ ] **Step 3: Implement in `LoginPage.tsx`**

Modify the imports at the top of `src/routes/login/LoginPage.tsx`:

```tsx
import { useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Loader2, ShieldCheck, LayoutGrid, BarChart3, Rocket } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { supabase } from '@/lib/supabase'
import { useRememberedEmail } from '@/features/auth/useRememberedEmail'
```

Update the schema (add `rememberEmail`):

```tsx
const loginSchema = z.object({
  email: z.string().min(1, 'Informe seu email').email('Email inválido'),
  password: z.string().min(1, 'Informe sua senha'),
  rememberEmail: z.boolean(),
})
```

Update the component body — replace from the `export default function LoginPage()` line through the end of `onSubmit`:

```tsx
export default function LoginPage() {
  const navigate = useNavigate()
  const [authError, setAuthError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const { rememberedEmail, remember, forget } = useRememberedEmail()
  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: rememberedEmail ?? '',
      password: '',
      rememberEmail: rememberedEmail !== null,
    },
  })

  async function onSubmit(values: LoginFormValues) {
    setAuthError(null)
    const { error } = await supabase.auth.signInWithPassword({
      email: values.email,
      password: values.password,
    })

    if (error) {
      setAuthError('Email ou senha inválidos.')
      return
    }

    if (values.rememberEmail) {
      remember(values.email)
    } else {
      forget()
    }

    navigate('/dashboard', { replace: true })
  }
```

Add the checkbox row inside the `<form>`, between the password field's closing `</div>` and the `{authError && ...}` block:

```tsx
            <div className="flex items-center gap-2">
              <Controller
                name="rememberEmail"
                control={control}
                render={({ field }) => (
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    aria-label="Lembrar meu email"
                  />
                )}
              />
              <span className="text-sm text-muted-foreground">Lembrar meu email</span>
            </div>
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test -- LoginPage`
Expected: PASS — all 8 tests (4 pre-existing + 4 new) green.

- [ ] **Step 5: Run the full test suite, lint, and typecheck**

Run: `npm run test && npm run lint && npm run typecheck`
Expected: PASS — no regressions elsewhere (e.g. no other file imports `LoginFormValues` or relies on the old 2-field schema).

- [ ] **Step 6: Commit**

```bash
git add src/routes/login/LoginPage.tsx src/routes/login/LoginPage.test.tsx
git commit -m "feat: adiciona checkbox para lembrar email na tela de login"
```

---

### Task 4: Verificação manual no navegador

**Files:** none (manual verification only, per project convention of browser-checking UI changes before considering them done)

- [ ] **Step 1: Rodar o dev server**

Run: `npm run dev` (background), then poll `http://localhost:5173` until it responds.

- [ ] **Step 2: Verificar visualmente com Playwright headless**

Write a throwaway script (not committed — scratch only) that:
1. Navigates to `/login`.
2. Confirms the checkbox is unchecked and email is empty on first load (no `localStorage` entry).
3. Fills email/password, checks "Lembrar meu email", submits, confirms navigation to `/dashboard`.
4. Reloads `/login` directly (simulating a fresh visit) and confirms the email field is now pre-filled and the checkbox is checked.
5. Unchecks the checkbox, re-submits, reloads `/login` again, confirms the email field is empty again.

Expected: all 5 assertions hold; no console errors at any step.

- [ ] **Step 3: Parar o dev server**

Run: `lsof -ti:5173 -sTCP:LISTEN | xargs -r kill`

---

### Task 5: Atualizar `CLAUDE.md`

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Adicionar parágrafo em "Project status"**

Add a new paragraph after the "Avatar no Topbar" entry (before "## What is being built"):

```markdown
Lembrar email no login (2026-07-29): done — um checkbox "Lembrar meu email" na `LoginPage` persiste (só) o email em `localStorage` (`apontilinkcenter:remembered-email`, via novo hook `src/features/auth/useRememberedEmail.ts`) quando o login é bem-sucedido, e pré-preenche o campo (com o checkbox já marcado) na próxima visita. Complementa, não substitui, o `autoComplete="email"` já existente — pensado para quem usa gerenciador de senhas externo e não conta com o autofill nativo do navegador. Senha nunca é persistida por essa feature. Ver `docs/superpowers/specs/2026-07-29-lembrar-email-login-design.md`.
```

- [ ] **Step 2: Atualizar a seção "Architecture"**

In the bullet list under `## Architecture`, add a new line documenting the `auth` feature module addition (near the existing `Feature modules live in src/features/<domain>/` bullet, or as its own short bullet):

```markdown
- `src/features/auth/useRememberedEmail.ts` (added 2026-07-29) — wraps a single `localStorage` key (`apontilinkcenter:remembered-email`) behind `{ rememberedEmail, remember(email), forget() }`. Used only by `LoginPage`, wired through `react-hook-form`'s `Controller` (the shadcn `Checkbox` is a Base UI component exposing `checked`/`onCheckedChange`, not a native `onChange`, same reason `Switch` usages elsewhere in the app never use plain `register()`).
```

- [ ] **Step 3: Atualizar a bullet do Login em "Screens / feature surface"**

Append to the existing Login bullet (the one starting with `**Login** (\`src/routes/login/LoginPage.tsx\`, redesigned 2026-07-28)`):

```markdown
 Since 2026-07-29, a "Lembrar meu email" checkbox additionally persists just the email (never the password) in `localStorage` via `useRememberedEmail` — see "Project status" above.
```

- [ ] **Step 4: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: atualiza CLAUDE.md com o checkbox de lembrar email no login"
```
