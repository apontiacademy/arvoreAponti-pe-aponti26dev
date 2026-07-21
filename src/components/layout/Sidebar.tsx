import { NavLink, useLocation } from 'react-router-dom'
import { LayoutDashboard, ListTree, BarChart3, User, Settings, LogOut } from 'lucide-react'
import {
  Sidebar as SidebarPrimitive,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar'
import { supabase } from '@/lib/supabase'

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/pages', label: 'Árvores', icon: ListTree },
  { to: '/analytics', label: 'Analytics', icon: BarChart3 },
  { to: '/profile', label: 'Perfil', icon: User },
  { to: '/settings', label: 'Configurações', icon: Settings },
]

export function Sidebar() {
  const location = useLocation()

  return (
    <SidebarPrimitive>
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-1.5 font-heading font-semibold">
          <img src="/APONTI_SIMBOLO_RGB-01.svg" alt="" className="size-6" />
          Aponti Link Center
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map(({ to, label, icon: Icon }) => {
                const isActive =
                  location.pathname === to || location.pathname.startsWith(`${to}/`)
                return (
                  <SidebarMenuItem key={to}>
                    <SidebarMenuButton isActive={isActive} render={<NavLink to={to} />}>
                      <Icon />
                      <span>{label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={() => supabase.auth.signOut()}
            >
              <LogOut />
              <span>Sair</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </SidebarPrimitive>
  )
}
