import { useTranslation } from 'react-i18next';
import { Container } from './container.tsx';
import { LanguageChooser } from './language-chooser.tsx';

interface TopBarProps {
  /** Optional content to render between the title and language chooser */
  children?: React.ReactNode;
}

export function TopBar({ children }: TopBarProps) {
  const { t } = useTranslation();

  return (
    <header className="border-b border-base-300 bg-base-100">
      <Container className="navbar py-3">
        <div className="navbar-start">
          <h1 className="text-lg font-semibold text-base-content">{t('app.title')}</h1>
        </div>
        <div className="navbar-end flex items-center gap-2">
          {children}
          <LanguageChooser />
        </div>
      </Container>
    </header>
  );
}
