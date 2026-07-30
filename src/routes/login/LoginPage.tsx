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

const loginSchema = z.object({
  email: z.string().min(1, 'Informe seu email').email('Email inválido'),
  password: z.string().min(1, 'Informe sua senha'),
  rememberEmail: z.boolean(),
})

type LoginFormValues = z.infer<typeof loginSchema>

const FEATURES = [
  { icon: LayoutGrid, text: 'Editor drag-and-drop de blocos' },
  { icon: BarChart3, text: 'Analytics de visualizações e cliques' },
  { icon: Rocket, text: 'Publicação instantânea' },
]

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

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden flex-col justify-between overflow-hidden bg-primary p-12 text-primary-foreground lg:flex">
        <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary to-brand-purple-dark" />
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage: 'radial-gradient(circle, white 1.5px, transparent 1.5px)',
            backgroundSize: '32px 32px',
          }}
        />
        <div className="absolute top-1/3 -left-16 size-72 rounded-full bg-white/5 blur-3xl" />
        <div className="absolute right-0 bottom-1/4 size-56 rounded-full bg-accent/25 blur-2xl" />

        <div className="relative flex items-center gap-2">
          <img src="/APONTI_SIMBOLO_RGB-01.svg" alt="" className="size-7 brightness-0 invert" />
          <span className="text-2xl font-bold tracking-tight">Aponti</span>
        </div>

        <div className="relative space-y-5">
          <div className="mb-2 flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-white/10">
              <ShieldCheck className="size-5" />
            </div>
          </div>
          <h1 className="text-4xl leading-tight font-bold">ApontiLinkCenter</h1>
          <p className="max-w-xs text-base leading-relaxed text-primary-foreground/65">
            Crie, edite e publique páginas de links da Aponti em um só lugar.
          </p>

          <div className="space-y-3 pt-4">
            {FEATURES.map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-3 text-sm text-primary-foreground/70">
                <Icon className="size-4 shrink-0" />
                {text}
              </div>
            ))}
          </div>
        </div>

        <div className="relative text-xs text-primary-foreground/40">
          © {new Date().getFullYear()} Aponti Academy
        </div>
      </div>

      <div className="flex items-center justify-center bg-background p-8">
        <div className="w-full max-w-sm space-y-8">
          <div className="space-y-1">
            <div className="mb-4 flex items-center gap-2 lg:hidden">
              <img src="/APONTI_SIMBOLO_RGB-01.svg" alt="Aponti" className="size-7" />
              <span className="text-2xl font-bold text-primary">Aponti</span>
            </div>
            <h2 className="text-2xl font-bold text-foreground">Entrar</h2>
            <p className="text-sm text-muted-foreground">Acesse o painel com sua conta da Aponti.</p>
          </div>

          <form className="space-y-5" onSubmit={handleSubmit(onSubmit)} noValidate>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                className="h-11"
                {...register('email')}
              />
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  className="h-11 pr-8"
                  {...register('password')}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="absolute top-1/2 right-0.5 -translate-y-1/2"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </Button>
              </div>
              {errors.password && (
                <p className="text-sm text-destructive">{errors.password.message}</p>
              )}
            </div>
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
            {authError && (
              <p role="alert" className="text-sm text-destructive">
                {authError}
              </p>
            )}
            <Button type="submit" className="h-11 w-full" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Entrando...
                </>
              ) : (
                'Entrar'
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
