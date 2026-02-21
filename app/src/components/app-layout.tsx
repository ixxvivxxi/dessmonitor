import { Outlet, Link, useLocation } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { LayoutDashboard, Settings } from 'lucide-react'
import { Container } from './container.tsx'
import { TopBar } from './top-bar.tsx'

interface AppLayoutProps {
  /** Minimal top bar (name + language chooser only), no nav or logout */
  minimal?: boolean
  /** Custom content instead of Outlet */
  children?: React.ReactNode
}

export function AppLayout({ minimal = false, children }: AppLayoutProps) {
  const { t } = useTranslation()
  const { pathname } = useLocation()

  return (
    <div className="flex min-h-screen flex-col bg-base-200">
      <TopBar>
        {!minimal && (
          <>
            {pathname !== '/dashboard' && (
              <Link
                to="/dashboard"
                className="btn btn-ghost btn-sm gap-1.5 data-[status=active]:btn-active"
                activeProps={{ 'data-status': 'active' }}
              >
                <LayoutDashboard className="size-4 shrink-0" />
                <span className="hidden sm:inline">{t('nav.dashboard')}</span>
              </Link>
            )}
            {pathname !== '/settings' && (
              <Link
                to="/settings"
                className="btn btn-ghost btn-sm gap-1.5 data-[status=active]:btn-active"
                activeProps={{ 'data-status': 'active' }}
              >
                <Settings className="size-4 shrink-0" />
                <span className="hidden sm:inline">{t('nav.settings')}</span>
              </Link>
            )}
          </>
        )}
      </TopBar>
      <main className="flex flex-1 flex-col">
        <Container className="flex flex-1 flex-col py-6">
          {children ?? <Outlet />}
        </Container>
      </main>
    </div>
  )
}
