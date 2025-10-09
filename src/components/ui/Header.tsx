// src/components/ui/Header.tsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export default function Header({ title, back = false }: { title: string; back?: boolean }) {
  const nav = useNavigate();
  const { t } = useTranslation('common');

  return (
    <header className="bg-inherit">
      <div className="h-12 flex items-center border-b">
        <div className="w-12 flex items-center justify-center">
          {back && (
            <button
              onClick={() => nav(-1)}
              className="btn btn-ghost h-10 w-10 rounded-full"
              aria-label={t('a11y.back')}
              title={t('a11y.back')}
            >
              ←
            </button>
          )}
        </div>
        <div className="flex-1" />
        <div className="w-12" />
      </div>
      <div className="px-5 pt-3 pb-2">
        <h1 className="ios-title text-center">{title}</h1>
      </div>
    </header>
  );
}
