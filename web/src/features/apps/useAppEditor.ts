import { useEffect, useRef, useState } from 'react';
import { useAppMetadataPreview } from '../../hooks/useAppMetadataPreview';
import type { NavApp } from '../../types/app';
import {
  createAppEditForm,
  createBlankAppForm,
  isAutomaticDescription,
  type AppFormState,
} from './appEditor';

export function useAppEditor(previewEnabled: boolean) {
  const [form, setForm] = useState<AppFormState>(() => createBlankAppForm());
  const [autoDescription, setAutoDescription] = useState<string | null>(null);
  const autoDescriptionRef = useRef<string | null>(null);
  const preview = useAppMetadataPreview(form.url, previewEnabled);

  useEffect(() => {
    const resolvedDescription = preview.data?.resolvedDescription;
    if (!resolvedDescription) {
      return;
    }

    setForm((current) => {
      if (
        current.description.trim() &&
        current.description !== autoDescriptionRef.current
      ) {
        return current;
      }

      autoDescriptionRef.current = resolvedDescription;
      setAutoDescription(resolvedDescription);
      return current.description === resolvedDescription
        ? current
        : { ...current, description: resolvedDescription };
    });
  }, [preview.data?.resolvedDescription]);

  function reset(categoryId?: number) {
    autoDescriptionRef.current = null;
    setAutoDescription(null);
    setForm(createBlankAppForm(categoryId));
  }

  function edit(app: NavApp) {
    const state = createAppEditForm(app);
    autoDescriptionRef.current = state.autoDescription;
    setAutoDescription(state.autoDescription);
    setForm(state.form);
  }

  function changeDescription(description: string) {
    autoDescriptionRef.current = null;
    setAutoDescription(null);
    setForm((current) => ({ ...current, description }));
  }

  return {
    form,
    setForm,
    autoDescription,
    descriptionIsAuto: isAutomaticDescription(form, autoDescription),
    preview,
    reset,
    edit,
    changeDescription,
  };
}
